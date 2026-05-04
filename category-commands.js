// category-commands.js - Category-based command helper
// This file works with the category system in server.js

const fs = require('fs');
const path = require('path');

class CategoryCommandHelper {
    constructor() {
        this.categories = new Map();
        this.loadCategories();
    }

    loadCategories() {
        // Define categories based on command files
        const commandsPath = path.join(__dirname, 'commands');
        
        if (fs.existsSync(commandsPath)) {
            const files = fs.readdirSync(commandsPath);
            
            files.forEach(file => {
                if (file.endsWith('.js')) {
                    const cmdPath = path.join(commandsPath, file);
                    try {
                        const cmd = require(cmdPath);
                        const category = cmd.category || 'uncategorized';
                        
                        if (!this.categories.has(category)) {
                            this.categories.set(category, []);
                        }
                        
                        this.categories.get(category).push({
                            file: file,
                            pattern: cmd.pattern,
                            alias: cmd.alias || [],
                            description: cmd.description || 'No description'
                        });
                    } catch (err) {
                        console.log(`Error loading ${file}:`, err.message);
                    }
                }
            });
        }
    }

    getCategoryCommands(category) {
        return this.categories.get(category) || [];
    }

    getAllCategories() {
        return Array.from(this.categories.keys());
    }

    generateCategoryHelp(category) {
        const commands = this.getCategoryCommands(category);
        
        if (commands.length === 0) {
            return null;
        }

        const icons = {
            sports: '⚽',
            downloader: '📥',
            search: '🔍',
            games: '🎮',
            admin: '👑',
            owner: '👑',
            tools: '🛠️',
            fun: '🎉',
            ai: '🤖',
            group: '👥',
            music: '🎵'
        };

        const icon = icons[category] || '📁';
        let message = `${icon} *${category.toUpperCase()} COMMANDS* ${icon}\n`;
        message += `━━━━━━━━━━━━━━\n\n`;

        commands.forEach(cmd => {
            message += `└ *.*${cmd.pattern}*\n`;
            if (cmd.alias.length > 0) {
                message += `   └ Aliases: ${cmd.alias.map(a => `.${a}`).join(', ')}\n`;
            }
            message += `   └ ${cmd.description}\n\n`;
        });

        message += `━━━━━━━━━━━━━━\n⚡ Powered by TRACLE-LITE`;
        
        return message;
    }

    refresh() {
        this.categories.clear();
        this.loadCategories();
    }
}

module.exports = new CategoryCommandHelper();
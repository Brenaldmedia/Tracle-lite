// commands.js - in the root 
const fs = require('fs-extra');
const path = require('path');

// Function to send messages with YOUR preferred context style
async function sendMessageWithContext(conn, jid, text, options = {}) {
    const contextInfo = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
        }
    };
    
    // Add externalAdReply if provided
    if (options.externalAdReply) {
        contextInfo.externalAdReply = options.externalAdReply;
    }
    
    return conn.sendMessage(jid, { 
        text,
        contextInfo
    }, options.quoted ? { quoted: options.quoted } : {});
}

class CommandHandler {
    constructor() {
        this.commands = new Map();
        this.loadCommands();
    }

    // Load all commands from commands folder
    loadCommands() {
        try {
            const commandsPath = path.join(__dirname, 'commands');
            if (!fs.existsSync(commandsPath)) {
                fs.mkdirSync(commandsPath, { recursive: true });
                console.log('📁 Created commands folder');
                this.createSampleCommand();
                return;
            }

            const tempCommands = new Map();
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            console.log(`📂 Found ${commandFiles.length} command files`);

            // Load antibadword command first
            try {
                const antibadword = require('./commands/antibadword');
                tempCommands.set(antibadword.name, antibadword);
                console.log(`✅ Loaded command: ${antibadword.name} (from antibadword.js)`);
                if (antibadword.ownerOnly) {
                    console.log(`   └── Owner only command`);
                }
            } catch (error) {
                console.log('⚠️ Antibadword command not available');
            }

            // Load anticall command
            try {
                const anticall = require('./commands/anticall');
                tempCommands.set(anticall.name, anticall);
                console.log(`✅ Loaded command: ${anticall.name} (from anticall.js)`);
                if (anticall.ownerOnly) {
                    console.log(`   └── Owner only command`);
                }
            } catch (error) {
                console.log('⚠️ Anticall command not available');
            }

            // Load creategc command
            try {
                const creategc = require('./commands/creategc');
                tempCommands.set(creategc.name, creategc);
                console.log(`✅ Loaded command: ${creategc.name} (from creategc.js)`);
                if (creategc.ownerOnly) {
                    console.log(`   └── Owner only command`);
                }
            } catch (error) {
                console.log('⚠️ Creategc command not available');
            }

            // Load pair command
            try {
                const pair = require('./commands/pair');
                tempCommands.set(pair.name, pair);
                console.log(`✅ Loaded command: ${pair.name} (from pair.js)`);
                if (pair.ownerOnly) {
                    console.log(`   └── Owner only command`);
                }
            } catch (error) {
                console.log('⚠️ Pair command not available');
            }
           
            // Load other commands from files
            commandFiles.forEach(file => {
                try {
                    // Skip if it's the same as antibadword, anticall, creategc, pair
                    const skipFiles = ['antibadword.js', 'anticall.js', 'creategc.js', 'pair.js'];
                    if (skipFiles.includes(file)) return;
                    
                    // Clear require cache to allow hot reload
                    const commandPath = path.join(commandsPath, file);
                    delete require.cache[require.resolve(commandPath)];
                    
                    const commandModule = require(commandPath);
                    
                    // Support multiple patterns - like file_A
                    let commandNames = [];
                    if (commandModule.pattern) {
                        commandNames = Array.isArray(commandModule.pattern) ? commandModule.pattern : [commandModule.pattern];
                    } else if (commandModule.name) {
                        commandNames = [commandModule.name];
                    } else {
                        commandNames = [file.replace('.js', '')];
                    }

                    // Register each command name
                    commandNames.forEach(cmdName => {
                        tempCommands.set(cmdName.toLowerCase(), commandModule);
                        console.log(`✅ Loaded command: ${cmdName} (from ${file})`);
                        
                        if (commandModule.ownerOnly) {
                            console.log(`   └── Owner only command`);
                        }
                    });

                } catch (error) {
                    console.error(`❌ Error loading command ${file}:`, error);
                }
            });

            this.commands = tempCommands;
            console.log(`📦 Total commands loaded: ${this.commands.size}`);
            
            // =============== ADD CATEGORY COMMANDS DYNAMICALLY ===============
            const categoryGroups = new Map();
            
            for (const [cmdName, cmd] of this.commands) {
                const category = cmd.category || "General";
                if (!categoryGroups.has(category)) {
                    categoryGroups.set(category, []);
                }
                categoryGroups.get(category).push({
                    name: cmdName,
                    aliases: cmd.alias || [],
                    description: cmd.description || "No description"
                });
            }
            
            console.log(`📂 Found ${categoryGroups.size} command categories`);
            
            function generateCategoryMenu(category) {
                const commands = categoryGroups.get(category);
                if (!commands || commands.length === 0) return null;
                
                const icons = {
                    "sports": "⚽", "downloader": "📥", "search": "🔍", "games": "🎮",
                    "admin": "👑", "owner": "👑", "tools": "🛠️", "fun": "🎉",
                    "ai": "🤖", "group": "👥", "music": "🎵", "General": "📌"
                };
                
                const icon = icons[category.toLowerCase()] || "📁";
                let message = `${icon} *${category.toUpperCase()} COMMANDS* ${icon}\n━━━━━━━━━━━━━━━━━\n\n`;
                
                commands.forEach(cmd => {
                    message += `└ *.*${cmd.name}*`;
                    if (cmd.aliases && cmd.aliases.length > 0) {
                        message += ` (${cmd.aliases.map(a => `.${a}`).join(", ")})`;
                    }
                    message += `\n   └ ${cmd.description}\n\n`;
                });
                
                message += `━━━━━━━━━━━━━━━━━\n⚡ Powered by TRACLE-LITE`;
                return message;
            }
            
            function generateAllCategoriesMenu() {
                let message = `📚 *ALL COMMAND CATEGORIES* 📚\n━━━━━━━━━━━━━━━━━\n\n`;
                
                for (const [category, commands] of categoryGroups) {
                    const icons = {
                        "sports": "⚽", "downloader": "📥", "search": "🔍", "games": "🎮",
                        "admin": "👑", "owner": "👑", "tools": "🛠️", "fun": "🎉",
                        "ai": "🤖", "group": "👥", "music": "🎵", "General": "📌"
                    };
                    const icon = icons[category.toLowerCase()] || "📁";
                    message += `${icon} *${category}* - ${commands.length} commands\n`;
                    message += `   └ Type .${category.toLowerCase()} to see all commands\n\n`;
                }
                
                message += `━━━━━━━━━━━━━━━━━\n💡 *Tip:* Type .[category] to see commands!\n⚡ Powered by TRACLE-LITE`;
                return message;
            }
            
            // Add category command for each category
            for (const [category, commands] of categoryGroups) {
                const categoryName = category.toLowerCase();
                if (!this.commands.has(categoryName) && categoryName !== "general") {
                    this.commands.set(categoryName, {
                        pattern: categoryName,
                        category: category,
                        description: `Show all ${category} commands`,
                        execute: async (conn, mek, m, { reply }) => {
                            const menu = generateCategoryMenu(category);
                            if (menu) {
                                await reply(menu);
                            } else {
                                await reply(`❌ No ${category} commands found.\n> ⚡ Powered by TRACLE-LITE`);
                            }
                        }
                    });
                    console.log(`   ✅ Added .${categoryName} command`);
                }
            }
            
            // Add .categories command
            if (!this.commands.has('categories')) {
                this.commands.set('categories', {
                    pattern: "categories",
                    alias: ["cmds", "allcmds"],
                    category: "tools",
                    description: "Show all command categories",
                    execute: async (conn, mek, m, { reply }) => {
                        const menu = generateAllCategoriesMenu();
                        await reply(menu);
                    }
                });
                console.log(`   ✅ Added .categories command`);
            }
            
            // Add .all command
            if (!this.commands.has('all')) {
                this.commands.set('all', {
                    pattern: "all",
                    alias: ["allcommands"],
                    category: "tools",
                    description: "Show all available commands",
                    execute: async (conn, mek, m, { reply, userPrefix }) => {
                        let message = `📋 *ALL COMMANDS* 📋\n━━━━━━━━━━━━━━━━━\n\n`;
                        
                        for (const [category, commands] of categoryGroups) {
                            message += `🔹 *${category.toUpperCase()}*\n`;
                            commands.forEach(cmd => {
                                message += `   └ .${cmd.name}\n`;
                            });
                            message += `\n`;
                        }
                        
                        message += `━━━━━━━━━━━━━━━━━━\n💡 Use .[category] for detailed list\n⚡ Powered by TRACLE-LITE`;
                        await reply(message);
                    }
                });
                console.log(`   ✅ Added .all command`);
            }
            // =============== END CATEGORY COMMANDS ===============

        } catch (error) {
            console.error('❌ Error loading commands:', error);
        }
    }

    // Get a command
    getCommand(commandName) {
        return this.commands.get(commandName.toLowerCase());
    }

    // Generate menu
    generateMenu(userPrefix, sessionId, userSettings, BOT_NAME, OWNER_NAME, commandsMap = null) {
        const commandMap = commandsMap || this.commands;
        const commandCount = commandMap.size;
        
        let ownerOnlyCount = 0;
        let publicCount = 0;
        const commandCategories = {};
        
        for (const [name, cmd] of commandMap.entries()) {
            if (cmd.ownerOnly) {
                ownerOnlyCount++;
            } else {
                publicCount++;
            }
            
            const category = cmd.category || 'General';
            if (!commandCategories[category]) {
                commandCategories[category] = [];
            }
            commandCategories[category].push({ 
                name, 
                ownerOnly: cmd.ownerOnly || false 
            });
        }
        
        const sortedCategories = Object.keys(commandCategories).sort();
        
        let menuText = `
🚀 *${userSettings.botName || BOT_NAME}* 🚀
📌 *Prefix :* ${userPrefix}
👤 *Owner  :* ${userSettings.ownerName || OWNER_NAME}
🔧 *Total  :* ${commandCount} commands
🔒 *Mode   :* ${userSettings.botMode}

💡 *Auto Features:*
• Auto-status viewing ${userSettings.autoViewStatus === "true" ? "✅" : "❌"}
• Auto-status react  ${userSettings.autoLikeStatus === "true" ? "✅" : "❌"}
🔒 *Security Features:* 
• Anti-delete        ${userSettings.antiDelete === "true" ? "✅" : "❌"}

📋 COMMAND LIST
───────────────────
`;

        sortedCategories.forEach(category => {
            const commands = commandCategories[category];
            menuText += `\n🔹 *${category.toUpperCase()}:*\n`;
            
            commands.forEach(cmd => {
                const prefix = cmd.ownerOnly ? '   🔒 ' : '   • ';
                menuText += `${prefix}${userPrefix}${cmd.name}\n`;
            });
        });

        const globalConnections = global.activeConnections || new Map();
        const activeSessionCount = Array.from(globalConnections.values()).filter(c => c.isConnected).length;
        
        menuText += `
───────────────────
📚 *Total Commands:* ${commandCount}
🔧 *Bot Mode:* ${userSettings.botMode}
⚡ *Active Sessions:* ${activeSessionCount}

Type ${userPrefix}[command] to use.
Example: ${userPrefix}ping
`;

        return menuText;
    }

    // Generate support message
    generateSupportMessage(userSettings) {
        return `🏦 *BANK DETAILS:*
🏛️ Bank Name: *${userSettings.bankName}*
📊 Account Number: *${userSettings.accountNumber}*
👤 Account Name: ${userSettings.accountName}

━━━━━━━━━━━━━━━━━━━━
💡 *WE NEED YOUR SUPPORT*

Your generous support helps us keep *TRACLE - LITE* features free for everyone! 

With your contributions, we can:
• Maintain and improve the bot
• Add new exciting features  
• Keep servers running smoothly
• Provide free access to all users

Every donation, no matter how small, makes a big difference! 🙏

Thank you for supporting the development of TRACLE - LITE! 🚀`;
    }

    // Get quoted message
    getQuotedMessage(message) {
        if (!message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            return null;
        }
        
        const quoted = message.message.extendedTextMessage.contextInfo;
        return {
            message: {
                key: {
                    remoteJid: quoted.participant || quoted.stanzaId,
                    fromMe: quoted.participant === (message.key.participant || message.key.remoteJid),
                    id: quoted.stanzaId
                },
                message: quoted.quotedMessage,
                mtype: Object.keys(quoted.quotedMessage || {})[0]?.replace('Message', '') || 'text'
            },
            sender: quoted.participant
        };
    }

    // Create sample command
    createSampleCommand() {
        const sampleCommand = `
// Sample command
module.exports = {
    pattern: 'ping',
    description: 'Check if bot is online',
    category: 'General',
    
    async execute(conn, mek, m, { reply }) {
        await reply('🏓 Pong! Bot is online and working!');
    }
};
`;

        const samplePath = path.join(__dirname, 'commands', 'ping.js');
        fs.writeFileSync(samplePath, sampleCommand.trim());
        console.log('📝 Created sample ping command');
    }
}

// Export singleton instance AND the context function
module.exports = new CommandHandler();
module.exports.sendMessageWithContext = sendMessageWithContext;
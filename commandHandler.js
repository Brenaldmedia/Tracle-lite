///commandHandler.js
const fs = require('fs-extra');
const path = require('path');

class CommandHandler {
    constructor() {
        this.commands = new Map();
        this.loadCommands();
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        if (fs.existsSync(commandsPath)) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            
            commandFiles.forEach(file => {
                try {
                    const command = require(path.join(commandsPath, file));
                    if (command.name && command.execute) {
                        this.commands.set(command.name, command);
                        console.log(`✅ Loaded command: ${command.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Error loading command ${file}:`, error);
                }
            });
        }
    }

    getCommand(name) {
        return this.commands.get(name);
    }

    getAllCommands() {
        return Array.from(this.commands.values());
    }

    async executeCommand(commandName, sock, message, args, userId, config) {
        const command = this.getCommand(commandName);
        if (!command) return false;

        try {
            await command.execute(sock, message, args, userId, config);
            return true;
        } catch (error) {
            console.error('Command execution error:', error);
            throw error;
        }
    }
}

module.exports = CommandHandler;
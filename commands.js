// commands.js - FIXED VERSION WITH WORKING MENU AND CONTEXT FUNCTION
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
            serverMessageId: 200,
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
                // Create a sample command file
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

           
            // Load other commands from files
            commandFiles.forEach(file => {
                try {
                    // Skip if it's the same as antibadword, anticall, creategc
                    const skipFiles = ['antibadword.js', 'anticall.js', 'creategc.js'];
                    if (skipFiles.includes(file)) return;
                    
                    // Clear require cache to allow hot reload
                    const commandPath = path.join(commandsPath, file);
                    delete require.cache[require.resolve(commandPath)];
                    
                    const commandModule = require(commandPath);
                    
                    // Support multiple patterns - like file_A
                    let commandNames = [];
                    if (commandModule.pattern) {
                        // Can be string or array
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
                        
                        // Log if command has ownerOnly flag
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

        } catch (error) {
            console.error('❌ Error loading commands:', error);
        }
    }

    // Get a command
    getCommand(commandName) {
        return this.commands.get(commandName.toLowerCase());
    }

    // Generate menu - FIXED: No longer requires ../server
    generateMenu(userPrefix, sessionId, userSettings, BOT_NAME, OWNER_NAME, commandsMap = null) {
        // Use provided commandsMap or default to this.commands
        const commandMap = commandsMap || this.commands;
        const commandCount = commandMap.size;
        
        // Count owner-only commands
        let ownerOnlyCount = 0;
        let publicCount = 0;
        const commandCategories = {};
        
        // Organize commands by category
        for (const [name, cmd] of commandMap.entries()) {
            if (cmd.ownerOnly) {
                ownerOnlyCount++;
            } else {
                publicCount++;
            }
            
            // Get category or default to "General"
            const category = cmd.category || 'General';
            if (!commandCategories[category]) {
                commandCategories[category] = [];
            }
            // Store only name (no description)
            commandCategories[category].push({ 
                name, 
                ownerOnly: cmd.ownerOnly || false 
            });
        }
        
        // Sort categories alphabetically
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

        // Add commands by category - ONLY NAMES
        sortedCategories.forEach(category => {
            const commands = commandCategories[category];
            menuText += `\n🔹 *${category.toUpperCase()}:*\n`;
            
            commands.forEach(cmd => {
                const prefix = cmd.ownerOnly ? '   🔒 ' : '   • ';
                menuText += `${prefix}${userPrefix}${cmd.name}\n`;
            });
        });

        // FIXED: Get active connections from global variable instead of requiring server
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

    // Create sample command (if needed)
    createSampleCommand() {
        const sampleCommand = `
// Sample command using sendMessageWithContext function
const { sendMessageWithContext } = require('../commands');

module.exports = {
    name: 'ping',
    description: 'Check if bot is online',
    category: 'General',
    
    async execute(sock, message, args, bot) {
        const text = '🏓 Pong! Bot is online and working!';
        
        // Using the custom context function
        await sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Pong!",
                body: "Bot is online",
                thumbnailUrl: "https://files.catbox.moe/m3o9wj.jpg",
                sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                mediaType: 1
            }
        });
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
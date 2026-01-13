// commands/menu.js - Menu command with GIF at top
const fs = require('fs-extra');
const axios = require('axios');

module.exports = {
    name: 'menu',
    pattern: ['menu', 'help'],
    description: 'Show bot menu with all commands',
    category: 'General',
    
    async execute(conn, message, m, context) {
        try {
            const { userPrefix, sessionId, userSettings } = context;
            
            // Get the command handler
            const commandHandler = require('../commands');
            
            // Generate menu with all commands
            const menuText = commandHandler.generateMenu(
                userPrefix, 
                sessionId, 
                userSettings, 
                context.BOT_NAME, 
                context.OWNER_NAME, 
                commandHandler.commands
            );
            
            // Method 1: Send as video with GIF playback
            await conn.sendMessage(message.key.remoteJid, {
                // Use video message type with your GIF URL
                video: { url: "https://files.catbox.moe/iihw0j.mp4" },
                caption: menuText,
                gifPlayback: true, // This makes it play like a GIF
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    },
                    externalAdReply: {
                        title: `${userSettings.botName || context.BOT_NAME} Menu`,
                        body: `${commandHandler.commands.size} commands available`,
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                }
            }, { quoted: message });
            
        } catch (error) {
            console.error('Error in menu command:', error);
            // Fallback to text-only if video fails
            await conn.sendMessage(message.key.remoteJid, { 
                text: `❌ Error showing menu: ${error.message}`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            }, { quoted: message });
        }
    }
};
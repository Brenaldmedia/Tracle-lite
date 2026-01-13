// commands/ping.js - Ping command with your style context
module.exports = {
    name: 'ping',
    description: 'Check bot latency and status',
    category: 'Utility',
    
    async execute(conn, message, m, context) {
        try {
            const { userSettings, activeConnections } = context;
            
            const start = Date.now();
            await conn.sendPresenceUpdate('available', message.key.remoteJid);
            const latency = Date.now() - start;
            
            const activeSessions = Array.from(activeConnections.values()).filter(c => c.isConnected).length;
            const commandCount = context.commands?.size || 0;
            
            const pingMessage = `🏓 *PONG!*\n\n` +
                              `⚡ Speed: ${latency}ms\n` +
                              `🤖 Bot: ${userSettings.botName || context.BOT_NAME}\n` +
                              `🔧 Commands: ${commandCount}\n` +
                              `📱 Active Sessions: ${activeSessions}\n` +
                              `🕒 Uptime: ${Math.floor(process.uptime() / 60)} minutes\n\n` +
                              `✅ Bot is running smoothly!`;
            
            // Send with YOUR STYLE context info
            await conn.sendMessage(message.key.remoteJid, { 
                text: pingMessage,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    },
                    externalAdReply: {
                        title: "Bot Status",
                        body: `Speed: ${latency}ms | Active: ${activeSessions}`,
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                }
            }, { quoted: message });
            
        } catch (error) {
            console.error('Error in ping command:', error);
            // Send error with YOUR STYLE context info
            await conn.sendMessage(message.key.remoteJid, { 
                text: `❌ Error checking status: ${error.message}`,
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
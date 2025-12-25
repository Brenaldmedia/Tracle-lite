// File: commands/mode.js
module.exports = {
    name: 'mode',
    description: 'Change bot mode (public/private)',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const args = context.args || [];
        const userPrefix = context.userPrefix || context.PREFIX;
        const userSettings = context.userSettings || {};
        
        const newMode = args[0]?.toLowerCase();
        const validModes = ['public', 'private'];
        
        if (!newMode || !validModes.includes(newMode)) {
            const text = `📊 *Current Bot Mode:* ${userSettings.botMode || 'public'}\n\n` +
                        `Usage: ${userPrefix}mode [public/private]\n\n` +
                        `• public: Bot responds to everyone\n` +
                        `• private: Bot only responds to owner`;
            
            if (context.sendMessageWithContext) {
                await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                    quoted: message,
                    externalAdReply: {
                        title: "Bot Mode Settings",
                        body: `Current mode: ${userSettings.botMode || 'public'}`,
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            } else {
                await sock.sendMessage(message.key.remoteJid, { text }, { quoted: message });
            }
            return;
        }
        
        if (newMode === userSettings.botMode) {
            const text = `❌ Bot is already in ${userSettings.botMode} mode`;
            
            if (context.sendMessageWithContext) {
                await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                    quoted: message,
                    externalAdReply: {
                        title: "Mode Unchanged",
                        body: `Bot is already in ${userSettings.botMode} mode`,
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            } else {
                await sock.sendMessage(message.key.remoteJid, { text }, { quoted: message });
            }
            return;
        }
        
        // Update settings
        if (context.updateUserSettings) {
            context.updateUserSettings({ botMode: newMode });
        }
        
        const modeMessage = `✅ *Bot Mode Updated*\n\n` +
                          `• Previous: ${userSettings.botMode}\n` +
                          `• New: ${newMode}\n\n` +
                          `${newMode === 'private' ? '🔒 Bot will now only respond to owner commands' : '🌍 Bot will now respond to everyone'}`;
        
        if (context.sendMessageWithContext) {
            await context.sendMessageWithContext(sock, message.key.remoteJid, modeMessage, {
                quoted: message,
                externalAdReply: {
                    title: "Mode Changed Successfully",
                    body: `Bot mode changed to ${newMode}`,
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        } else {
            await sock.sendMessage(message.key.remoteJid, { text: modeMessage }, { quoted: message });
        }
    }
};
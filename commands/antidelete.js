module.exports = {
    name: 'antidelete',
    description: 'Toggle anti-delete feature',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const args = context.args || [];
        const userSettings = context.userSettings || {};
        const userPrefix = context.userPrefix || context.PREFIX;
        
        const currentStatus = userSettings.antiDelete || "true";
        const newStatus = args[0]?.toLowerCase();
        
        if (!newStatus || !['on', 'off', 'true', 'false', 'mode'].includes(newStatus)) {
            const statusText = currentStatus === "true" ? '✅ ON' : '❌ OFF';
            const modeText = userSettings.antiDeleteMode === "dm" ? 'Direct Message' : 'In Chat';
            const text = `🚫 *Anti-Delete Settings*\n\n` +
                        `Status: ${statusText}\n` +
                        `Mode: ${modeText}\n\n` +
                        `📝 *Commands:*\n` +
                        `${userPrefix}antidelete on - Enable\n` +
                        `${userPrefix}antidelete off - Disable\n` +
                        `${userPrefix}antidelete mode dm - Send to your DM\n` +
                        `${userPrefix}antidelete mode group - Send to same chat\n\n` +
                        `💡 When enabled, bot captures deleted messages with @mentions\n` +
                        `> 🚫 Powered by Tracle-Lite`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Anti-Delete Settings",
                    body: `Status: ${statusText} | Mode: ${modeText}`,
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        // Check if it's mode change
        if (newStatus === 'mode') {
            const mode = args[1]?.toLowerCase();
            if (!mode || !['dm', 'group'].includes(mode)) {
                const text = `❌ Invalid mode\n\n` +
                            `Available modes:\n` +
                            `• dm - Send to your DM\n` +
                            `• group - Send to same chat\n\n` +
                            `Usage: ${userPrefix}antidelete mode [dm/group]`;
                
                return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                    quoted: message
                });
            }
            
            const currentMode = userSettings.antiDeleteMode || "dm";
            if (mode === currentMode) {
                const text = `❌ Anti-delete mode is already set to ${mode}`;
                return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                    quoted: message
                });
            }
            
            context.updateUserSettings({ antiDeleteMode: mode });
            
            const text = `✅ *Anti-Delete Mode Updated*\n\n` +
                        `• Previous: ${currentMode}\n` +
                        `• New: ${mode}\n\n` +
                        `Deleted messages will be sent to ${mode === 'dm' ? 'your DM' : 'the same chat'} with @mentions.`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Anti-Delete Mode",
                    body: `Changed to: ${mode}`,
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        // It's status toggle
        const finalStatus = newStatus === 'on' || newStatus === 'true' ? "true" : "false";
        
        if (finalStatus === currentStatus) {
            const statusText = currentStatus === "true" ? 'ON' : 'OFF';
            const text = `❌ Anti-delete is already ${statusText}`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "No Changes",
                    body: `Already ${statusText}`,
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        context.updateUserSettings({ antiDelete: finalStatus });
        
        const statusText = finalStatus === "true" ? '✅ ON' : '❌ OFF';
        const text = `✅ *Anti-Delete Updated*\n\n` +
                    `• Previous: ${currentStatus === "true" ? 'ON' : 'OFF'}\n` +
                    `• New: ${finalStatus === "true" ? 'ON' : 'OFF'}\n\n` +
                    `Bot will ${finalStatus === "true" ? 'detect, capture and restore' : 'NOT detect'} deleted messages with @mentions.`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Anti-Delete Changed",
                body: `Set to: ${finalStatus === "true" ? 'ON' : 'OFF'}`,
                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
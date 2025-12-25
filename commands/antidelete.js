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
        
        if (!newStatus || !['on', 'off', 'true', 'false'].includes(newStatus)) {
            const statusText = currentStatus === "true" ? '✅ ON' : '❌ OFF';
            const modeText = userSettings.antiDeleteMode === "dm" ? 'Direct Message' : 'Group';
            const text = `🚫 *Anti-Delete Settings*\n\n` +
                        `Status: ${statusText}\n` +
                        `Mode: ${modeText}\n\n` +
                        `Usage:\n` +
                        `${userPrefix}antidelete [on/off]\n` +
                        `${userPrefix}antidelete mode [dm/group]\n\n` +
                        `Examples:\n` +
                        `${userPrefix}antidelete off\n` +
                        `${userPrefix}antidelete mode dm`;
            
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
                            `• group - Send to same group\n\n` +
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
            
            // Update mode
            context.updateUserSettings({ antiDeleteMode: mode });
            
            const text = `✅ *Anti-Delete Mode Updated*\n\n` +
                        `• Previous: ${currentMode}\n` +
                        `• New: ${mode}\n\n` +
                        `Deleted messages will be sent to ${mode === 'dm' ? 'your DM' : 'the same group'}.`;
            
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
        
        // Update settings
        context.updateUserSettings({ antiDelete: finalStatus });
        
        const statusText = finalStatus === "true" ? '✅ ON' : '❌ OFF';
        const text = `✅ *Anti-Delete Updated*\n\n` +
                    `• Previous: ${currentStatus === "true" ? 'ON' : 'OFF'}\n` +
                    `• New: ${finalStatus === "true" ? 'ON' : 'OFF'}\n\n` +
                    `Bot will ${finalStatus === "true" ? 'detect and restore' : 'NOT detect'} deleted messages.`;
        
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
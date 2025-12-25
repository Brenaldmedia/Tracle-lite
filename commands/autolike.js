module.exports = {
    name: 'autolike',
    description: 'Toggle auto-like status feature',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const args = context.args || [];
        const userSettings = context.userSettings || {};
        const userPrefix = context.userPrefix || context.PREFIX;
        
        const currentStatus = userSettings.autoLikeStatus || "false";
        const newStatus = args[0]?.toLowerCase();
        
        if (!newStatus || !['on', 'off', 'true', 'false'].includes(newStatus)) {
            const statusText = currentStatus === "true" ? '✅ ON' : '❌ OFF';
            const text = `❤️ *Auto-Like Status*\n\n` +
                        `Current: ${statusText}\n\n` +
                        `Usage: ${userPrefix}autolike [on/off]\n` +
                        `Example: ${userPrefix}autolike on`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Auto-Like Settings",
                    body: `Current: ${statusText}`,
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        const finalStatus = newStatus === 'on' || newStatus === 'true' ? "true" : "false";
        
        if (finalStatus === currentStatus) {
            const statusText = currentStatus === "true" ? 'ON' : 'OFF';
            const text = `❌ Auto-like is already ${statusText}`;
            
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
        context.updateUserSettings({ autoLikeStatus: finalStatus });
        
        const statusText = finalStatus === "true" ? '✅ ON' : '❌ OFF';
        const text = `✅ *Auto-Like Updated*\n\n` +
                    `• Previous: ${currentStatus === "true" ? 'ON' : 'OFF'}\n` +
                    `• New: ${finalStatus === "true" ? 'ON' : 'OFF'}\n\n` +
                    `Bot will ${finalStatus === "true" ? 'automatically react to' : 'NOT react to'} status updates.`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Auto-Like Changed",
                body: `Set to: ${finalStatus === "true" ? 'ON' : 'OFF'}`,
                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
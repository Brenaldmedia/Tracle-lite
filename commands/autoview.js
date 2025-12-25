module.exports = {
    name: 'autoview',
    description: 'Toggle auto-view status feature',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const args = context.args || [];
        const userSettings = context.userSettings || {};
        const userPrefix = context.userPrefix || context.PREFIX;
        
        const currentStatus = userSettings.autoViewStatus || "true";
        const newStatus = args[0]?.toLowerCase();
        
        if (!newStatus || !['on', 'off', 'true', 'false'].includes(newStatus)) {
            const statusText = currentStatus === "true" ? '✅ ON' : '❌ OFF';
            const text = `👀 *Auto-View Status*\n\n` +
                        `Current: ${statusText}\n\n` +
                        `Usage: ${userPrefix}autoview [on/off]\n` +
                        `Example: ${userPrefix}autoview off`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Auto-View Settings",
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
            const text = `❌ Auto-view is already ${statusText}`;
            
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
        context.updateUserSettings({ autoViewStatus: finalStatus });
        
        const statusText = finalStatus === "true" ? '✅ ON' : '❌ OFF';
        const text = `✅ *Auto-View Updated*\n\n` +
                    `• Previous: ${currentStatus === "true" ? 'ON' : 'OFF'}\n` +
                    `• New: ${finalStatus === "true" ? 'ON' : 'OFF'}\n\n` +
                    `Bot will ${finalStatus === "true" ? 'automatically view' : 'NOT view'} status updates.`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Auto-View Changed",
                body: `Set to: ${finalStatus === "true" ? 'ON' : 'OFF'}`,
                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
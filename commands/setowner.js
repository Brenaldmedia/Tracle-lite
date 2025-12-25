module.exports = {
    name: 'setowner',
    description: 'Set owner name',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const args = context.args || [];
        const userSettings = context.userSettings || {};
        const userPrefix = context.userPrefix || context.PREFIX;
        
        if (!args.length) {
            const text = `👑 *Owner Name Settings*\n\n` +
                        `Current: ${userSettings.ownerName || context.OWNER_NAME}\n\n` +
                        `Usage: ${userPrefix}setowner [name]\n\n` +
                        `Example: ${userPrefix}setowner Brenaldmedia`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Owner Settings",
                    body: `Current: ${userSettings.ownerName || context.OWNER_NAME}`,
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        const newOwnerName = args.join(' ');
        
        // Update settings
        context.updateUserSettings({ ownerName: newOwnerName });
        
        const text = `✅ *Owner Name Updated*\n\n` +
                    `• Previous: ${userSettings.ownerName || context.OWNER_NAME}\n` +
                    `• New: ${newOwnerName}\n\n` +
                    `This name will be shown in menu and owner command.`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Owner Name Changed",
                body: `New: ${newOwnerName}`,
                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
module.exports = {
    name: 'setbotimage',
    description: 'Set bot image URL',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const args = context.args || [];
        const userSettings = context.userSettings || {};
        const userPrefix = context.userPrefix || context.PREFIX;
        
        if (!args.length) {
            const text = `🖼️ *Bot Image Settings*\n\n` +
                        `Current: ${userSettings.botImage || context.MENU_IMAGE_URL}\n\n` +
                        `Usage: ${userPrefix}setbotimage [image_url]\n\n` +
                        `Example: ${userPrefix}setbotimage https://files.catbox.moe/zlu6dx.jpg`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Bot Image Settings",
                    body: "Set your bot's image URL",
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        const newImageUrl = args[0];
        
        // Basic URL validation
        if (!newImageUrl.startsWith('http')) {
            const text = `❌ Invalid URL\n\n` +
                        `Please provide a valid HTTP/HTTPS URL.\n` +
                        `Example: https://files.catbox.moe/zlu6dx.jpg`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message
            });
        }
        
        // Update settings
        context.updateUserSettings({ botImage: newImageUrl });
        
        const text = `✅ *Bot Image Updated*\n\n` +
                    `• Previous: ${userSettings.botImage || context.MENU_IMAGE_URL}\n` +
                    `• New: ${newImageUrl}\n\n` +
                    `This image will be used in menu and messages.`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Bot Image Changed",
                body: "New image URL set",
                thumbnailUrl: newImageUrl,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
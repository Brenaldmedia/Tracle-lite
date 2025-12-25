module.exports = {
    name: 'setbotname',
    description: 'Set bot name',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const args = context.args || [];
        const userSettings = context.userSettings || {};
        const userPrefix = context.userPrefix || context.PREFIX;
        
        if (!args.length) {
            const text = `🤖 *Bot Name Settings*\n\n` +
                        `Current: ${userSettings.botName || context.BOT_NAME}\n\n` +
                        `Usage: ${userPrefix}setbotname [name]\n\n` +
                        `Example: ${userPrefix}setbotname "TRACLE - LITE"`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Bot Name Settings",
                    body: `Current: ${userSettings.botName || context.BOT_NAME}`,
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        const newBotName = args.join(' ');
        
        // Update settings
        context.updateUserSettings({ botName: newBotName });
        
        const text = `✅ *Bot Name Updated*\n\n` +
                    `• Previous: ${userSettings.botName || context.BOT_NAME}\n` +
                    `• New: ${newBotName}\n\n` +
                    `This name will be shown in menu and all messages.`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Bot Name Changed",
                body: `New: ${newBotName}`,
                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
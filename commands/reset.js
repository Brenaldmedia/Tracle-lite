module.exports = {
    name: 'reset',
    description: 'Reset bot settings to default',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const userSettings = context.userSettings || {};
        const userPrefix = context.userPrefix || context.PREFIX;
        
        const defaultSettings = {
            botMode: "public",
            autoViewStatus: "true",
            autoLikeStatus: "false",
            antiDelete: "true",
            antiDeleteMode: "dm",
            bankName: "ZENITH Bank",
            accountNumber: "2126335411",
            accountName: "EMMANUEL ISIBOR",
            botImage: context.MENU_IMAGE_URL,
            ownerName: context.OWNER_NAME,
            botName: context.BOT_NAME
        };
        
        // Update all settings to default
        context.updateUserSettings(defaultSettings);
        
        const text = `🔄 *Settings Reset to Default*\n\n` +
                    `All settings have been reset to:\n\n` +
                    `🤖 *Bot Info:*\n` +
                    `• Name: ${context.BOT_NAME}\n` +
                    `• Owner: ${context.OWNER_NAME}\n` +
                    `• Image: ${context.MENU_IMAGE_URL}\n\n` +
                    `🔧 *Features:*\n` +
                    `• Mode: 🌍 PUBLIC\n` +
                    `• Auto-view: ✅ ON\n` +
                    `• Auto-like: ❌ OFF\n` +
                    `• Anti-delete: ✅ ON\n` +
                    `• Anti-delete mode: dm\n\n` +
                    `🏦 *Bank Details:*\n` +
                    `• Bank: ZENITH Bank\n` +
                    `• Account: 2126335411\n` +
                    `• Name: EMMANUEL ISIBOR\n\n` +
                    `✅ All settings have been reset successfully!`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Settings Reset",
                body: "All settings restored to default",
                thumbnailUrl: context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
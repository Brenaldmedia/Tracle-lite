module.exports = {
    name: 'settings',
    description: 'View all bot settings',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const userSettings = context.userSettings || {};
        const userPrefix = context.userPrefix || context.PREFIX;
        
        const text = `⚙️ *BOT SETTINGS*\n\n` +
                    `🤖 *Bot Info:*\n` +
                    `• Name: ${userSettings.botName || context.BOT_NAME}\n` +
                    `• Owner: ${userSettings.ownerName || context.OWNER_NAME}\n` +
                    `• Image: ${userSettings.botImage || context.MENU_IMAGE_URL}\n\n` +
                    `🔧 *Features:*\n` +
                    `• Mode: ${userSettings.botMode === "private" ? '🔒 PRIVATE' : '🌍 PUBLIC'}\n` +
                    `• Auto-view: ${userSettings.autoViewStatus === "true" ? '✅ ON' : '❌ OFF'}\n` +
                    `• Auto-like: ${userSettings.autoLikeStatus === "true" ? '✅ ON' : '❌ OFF'}\n` +
                    `• Anti-delete: ${userSettings.antiDelete === "true" ? '✅ ON' : '❌ OFF'}\n` +
                    `• Anti-delete mode: ${userSettings.antiDeleteMode || 'dm'}\n\n` +
                    `🏦 *Bank Details:*\n` +
                    `• Bank: ${userSettings.bankName || 'ZENITH Bank'}\n` +
                    `• Account: ${userSettings.accountNumber || '2126335411'}\n` +
                    `• Name: ${userSettings.accountName || 'EMMANUEL ISIBOR'}\n\n` +
                    `📌 *System:*\n` +
                    `• Prefix: ${userPrefix}\n` +
                    `• Commands: ${context.commands?.size || 0}\n` +
                    `• Active Sessions: ${Array.from(context.activeConnections?.values() || []).filter(c => c.isConnected).length}\n\n` +
                    `💡 *Commands to change:*\n` +
                    `${userPrefix}mode, ${userPrefix}autoview, ${userPrefix}autolike,\n` +
                    `${userPrefix}antidelete, ${userPrefix}setbank, ${userPrefix}setowner,\n` +
                    `${userPrefix}setbotname, ${userPrefix}setbotimage, ${userPrefix}setprefix`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Bot Settings",
                body: `${userSettings.botName || context.BOT_NAME} Configuration`,
                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
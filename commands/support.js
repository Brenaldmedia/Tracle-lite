module.exports = {
    name: 'support',
    description: 'Get support and donation information',
    category: 'General',
    
    async execute(sock, message, m, context) {
        const userSettings = context.userSettings || {};
        
        const text = `🏦 *BANK DETAILS:*\n\n` +
                    `🏛️ Bank Name: *${userSettings.bankName || 'ZENITH Bank'}*\n` +
                    `📊 Account Number: *${userSettings.accountNumber || '2126335411'}*\n` +
                    `👤 Account Name: ${userSettings.accountName || 'EMMANUEL ISIBOR'}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `💡 *WE NEED YOUR SUPPORT*\n\n` +
                    `Your generous support helps us keep *TRACLE - LITE* features free for everyone!\n\n` +
                    `With your contributions, we can:\n` +
                    `• Maintain and improve the bot\n` +
                    `• Add new exciting features\n` +
                    `• Keep servers running smoothly\n` +
                    `• Provide free access to all users\n\n` +
                    `Every donation, no matter how small, makes a big difference! 🙏\n\n` +
                    `Thank you for supporting the development of TRACLE - LITE! 🚀`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: `${userSettings.botName || context.BOT_NAME} Support`,
                body: "Your support helps keep the bot running",
                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
module.exports = {
    name: 'setbank',
    description: 'Set bank details for support',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const args = context.args || [];
        const userSettings = context.userSettings || {};
        const userPrefix = context.userPrefix || context.PREFIX;
        
        if (args.length < 3) {
            const text = `🏦 *Bank Details Settings*\n\n` +
                        `Current:\n` +
                        `• Bank: ${userSettings.bankName || 'ZENITH Bank'}\n` +
                        `• Account: ${userSettings.accountNumber || '2126335411'}\n` +
                        `• Name: ${userSettings.accountName || 'EMMANUEL ISIBOR'}\n\n` +
                        `Usage: ${userPrefix}setbank [bank_name] [account_number] [account_name]\n\n` +
                        `Example:\n` +
                        `${userPrefix}setbank "ZENITH Bank" 2126335411 "EMMANUEL ISIBOR"`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Bank Details Settings",
                    body: "Update your bank information",
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        const bankName = args[0];
        const accountNumber = args[1];
        const accountName = args.slice(2).join(' ');
        
        // Validate account number
        if (!/^\d+$/.test(accountNumber)) {
            const text = `❌ Invalid account number\n\n` +
                        `Account number should contain only numbers.\n` +
                        `Example: 2126335411`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message
            });
        }
        
        // Update settings
        context.updateUserSettings({ 
            bankName: bankName,
            accountNumber: accountNumber,
            accountName: accountName
        });
        
        const text = `✅ *Bank Details Updated*\n\n` +
                    `🏛️ *Bank:* ${bankName}\n` +
                    `📊 *Account:* ${accountNumber}\n` +
                    `👤 *Name:* ${accountName}\n\n` +
                    `These details will be shown in ${userPrefix}support command.`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Bank Details Updated",
                body: `${bankName} - ${accountNumber}`,
                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
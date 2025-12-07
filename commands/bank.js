const { getUserSettings } = require('../server');

module.exports = {
    pattern: 'bank',
    alias: ['bankdetails', 'account'],
    description: 'Display bank account details',
    category: 'bank',
    execute: async (conn, message, m, { reply, sessionId }) => {
        try {
            const userSettings = getUserSettings(sessionId);
            
            await reply(
                `🏦 *BANK ACCOUNT DETAILS*\n\n🏛️ Bank Name: *${userSettings.bankName}*\n📊 Account Number: *${userSettings.accountNumber}*\n\nThese are the owner's bank details for transactions.`
            );
        } catch (error) {
            console.error('Error in bank command:', error);
            await reply('❌ Error fetching bank details');
        }
    }
};
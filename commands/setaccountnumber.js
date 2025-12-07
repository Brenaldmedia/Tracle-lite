const { updateUserSettings, isBotOwner } = require('../server');

module.exports = {
    pattern: 'setaccountnumber',
    alias: ['setaccount', 'setacc'],
    description: 'Set account number',
    category: 'bank',
    execute: async (conn, message, m, { args, reply, sessionId }) => {
        try {
            if (!isBotOwner(conn, message)) {
                return await reply('❌ Owner only command');
            }

            if (args.length === 0) {
                return await reply(
                    `📊 *SET ACCOUNT NUMBER*\n\nUsage:\n• .setaccountnumber [account number]\n\nExample: .setaccountnumber 1234567890`
                );
            }

            const newAccountNumber = args[0];
            
            // Validate account number (only numbers)
            if (!/^\d+$/.test(newAccountNumber)) {
                return await reply('❌ Invalid account number. Please use only numbers.');
            }

            updateUserSettings(sessionId, { accountNumber: newAccountNumber });
            
            await reply(`✅ Account number updated to: *${newAccountNumber}*`);
        } catch (error) {
            console.error('Error in setaccountnumber command:', error);
            await reply('❌ Error updating account number');
        }
    }
};
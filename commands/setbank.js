const { updateUserSettings, isBotOwner } = require('../server');

module.exports = {
    pattern: 'setbank',
    alias: ['setbankname'],
    description: 'Set bank name',
    category: 'bank',
    execute: async (conn, message, m, { args, reply, sessionId }) => {
        try {
            if (!isBotOwner(conn, message)) {
                return await reply('❌ Owner only command');
            }

            if (args.length === 0) {
                return await reply(
                    `🏛️ *SET BANK NAME*\n\nUsage:\n• .setbank [bank name]\n\nExample: .setbank First Bank`
                );
            }

            const newBankName = args.join(' ');
            updateUserSettings(sessionId, { bankName: newBankName });
            
            await reply(`✅ Bank name updated to: *${newBankName}*`);
        } catch (error) {
            console.error('Error in setbank command:', error);
            await reply('❌ Error updating bank name');
        }
    }
};
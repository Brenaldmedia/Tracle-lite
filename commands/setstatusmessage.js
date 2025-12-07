const { updateUserSettings, isBotOwner } = require('../server');

module.exports = {
    pattern: 'setstatusreply',
    alias: ['setstatusmessage'],
    description: 'Set custom status reply message',
    category: 'settings',
    execute: async (conn, message, m, { args, reply, sessionId }) => {
        try {
            if (!isBotOwner(conn, message)) {
                return await reply('❌ Owner only command');
            }

            if (args.length === 0) {
                return await reply(
                    `💬 *SET STATUS REPLY MESSAGE*\n\nUsage:\n• .setstatusreply [your message]\n\nExample: .setstatusreply Your status has been seen by me.`
                );
            }

            const newMessage = args.join(' ');
            updateUserSettings(sessionId, { statusReply: newMessage });
            
            await reply(`✅ Status reply message updated to:\n"${newMessage}"`);
        } catch (error) {
            console.error('Error in setstatusreply command:', error);
            await reply('❌ Error updating status reply message');
        }
    }
};
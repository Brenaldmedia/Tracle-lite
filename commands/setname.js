const { updateUserSettings, isBotOwner } = require('../server');

module.exports = {
    pattern: 'setname',
    alias: ['setmyname'],
    description: 'Set your display name',
    category: 'customization',
    execute: async (conn, message, m, { args, reply, sessionId }) => {
        try {
            if (!isBotOwner(conn, message)) {
                return await reply('❌ Owner only command');
            }

            if (args.length === 0) {
                return await reply(
                    `👤 *SET OWNER NAME*\n\nUsage:\n• .setname [new name]\n\nExample: .setname Mark`
                );
            }

            const newName = args.join(' ');
            updateUserSettings(sessionId, { ownerName: newName });
            
            await reply(`✅ Owner name updated to: *${newName}*`);
        } catch (error) {
            console.error('Error in setname command:', error);
            await reply('❌ Error updating name');
        }
    }
};
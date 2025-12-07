const { updateUserSettings, isBotOwner } = require('../server');

module.exports = {
    pattern: 'setbotname',
    alias: ['setbot'],
    description: 'Set bot display name',
    category: 'customization',
    execute: async (conn, message, m, { args, reply, sessionId }) => {
        try {
            if (!isBotOwner(conn, message)) {
                return await reply('❌ Owner only command');
            }

            if (args.length === 0) {
                return await reply(
                    `🤖 *SET BOT NAME*\n\nUsage:\n• .setbotname [new bot name]\n\nExample: .setbotname MyBot`
                );
            }

            const newBotName = args.join(' ');
            updateUserSettings(sessionId, { botName: newBotName });
            
            await reply(`✅ Bot name updated to: *${newBotName}*`);
        } catch (error) {
            console.error('Error in setbotname command:', error);
            await reply('❌ Error updating bot name');
        }
    }
};
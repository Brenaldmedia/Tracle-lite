module.exports = {
    pattern: 'setprefix',
    alias: ['changeprefix', 'prefixset'],
    description: 'Change bot prefix',
    category: 'settings',
    execute: async (conn, message, m, { args, reply, sessionId }) => {
        try {
            const { isBotOwner } = require('../server');
            const prefix = require('../server').PREFIX;

            // Check if user is bot owner
            if (!isBotOwner(conn, message)) {
                return await reply(`❌ Owner only command`);
            }

            if (args.length === 0) {
                const userPrefixes = require('../server').userPrefixes;
                const currentPrefix = userPrefixes.get(sessionId) || prefix;
                
                return await reply(
                    `📌 *SET PREFIX*\n\nUsage:\n• ${prefix}setprefix [new prefix]\n\nExamples:\n${prefix}setprefix !\n${prefix}setprefix 😂\n${prefix}setprefix #\n\nCurrent Prefix: ${currentPrefix}`
                );
            }

            const newPrefix = args[0];
            const userPrefixes = require('../server').userPrefixes;
            
            // Set the new prefix for this user session
            userPrefixes.set(sessionId, newPrefix);
            
            await reply(
                `✅ Prefix updated to: ${newPrefix}\n\nNow use ${newPrefix} before commands.\nExample: ${newPrefix}menu`
            );
        } catch (error) {
            console.error('Error in setprefix command:', error);
            await reply('❌ Error processing setprefix command');
        }
    }
};
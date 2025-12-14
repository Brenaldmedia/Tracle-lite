module.exports = {
    pattern: 'opentime',
    alias: ['opengroup', 'scheduleopen'],
    description: 'Schedule group opening',
    category: 'group',
    execute: async (conn, message, m, { args, reply, from, isGroup, groupMetadata, sessionId }) => {
        try {
            if (!isGroup) return await reply('❌ This command can only be used in groups');

            const { isBotOwner, groupTimers } = require('../server');

            let isAdmin = false;
            if (groupMetadata?.participants) {
                const participant = groupMetadata.participants.find(p => p.id === m.sender);
                isAdmin = participant && ['admin', 'superadmin'].includes(participant.admin);
            }

            if (!isAdmin && !isBotOwner(conn, message, sessionId)) {
                return await reply('❌ Admin or owner only command');
            }

            if (args.length === 0) {
                const prefix = require('../server').PREFIX;
                return await reply(
                    `⏰ *OPEN TIME*\n\nUsage:\n• ${prefix}opentime [minutes]\n\nExamples:\n${prefix}opentime 5 - Open group in 5 minutes\n${prefix}opentime 0 - Open group immediately\n${prefix}opentime 60 - Open group in 1 hour`
                );
            }

            const minutes = parseInt(args[0]);
            if (isNaN(minutes) || minutes < 0) {
                return await reply('❌ Please provide a valid number of minutes');
            }

            if (groupTimers.has(from)) {
                clearTimeout(groupTimers.get(from).timeout);
                groupTimers.delete(from);
            }

            const timeoutDuration = minutes * 60000;

            groupTimers.set(from, {
                type: 'open',
                timeout: setTimeout(async () => {
                    try {
                        await conn.groupSettingUpdate(from, 'not_announcement');
                        await conn.sendMessage(from, { text: '🔓 Group has been opened as scheduled.' });
                    } catch (error) {
                        console.error("Error opening group:", error);
                        await conn.sendMessage(from, { text: `❌ Failed to open group: ${error.message}` });
                    } finally {
                        groupTimers.delete(from);
                    }
                }, timeoutDuration)
            });

            await reply(`✅ Group will be opened in ${minutes} minute(s)`);

        } catch (err) {
            console.error(err);
            await reply('❌ Error processing opentime command');
        }
    }
};
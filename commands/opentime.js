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

            const minutes = parseInt(args[0]);
            if (isNaN(minutes) || minutes < 0) {
                return await reply('❌ Please provide a valid number of minutes');
            }

            if (groupTimers.has(from)) {
                clearTimeout(groupTimers.get(from).timeout);
                groupTimers.delete(from);
            }

            const now = new Date();
            const scheduledTime = new Date(now.getTime() + minutes * 60000);

            groupTimers.set(from, {
                type: 'open',
                timeout: setTimeout(async () => {
                    try {
                        await conn.groupSettingUpdate(from, 'not_announcement');
                        await conn.sendMessage(from, { text: '🔓 Group has been opened as scheduled.' });
                    } finally {
                        groupTimers.delete(from);
                    }
                }, minutes * 60000)
            });

            const formatLocalTime = (date) =>
                date.toLocaleString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

            await reply(
                `✅ *Group will be opened at:*\n` +
                `🕒 ${formatLocalTime(scheduledTime)}`
            );

        } catch (err) {
            console.error(err);
            await reply('❌ Error processing opentime command');
        }
    }
};

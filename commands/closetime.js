module.exports = {
    pattern: 'closetime',
    alias: ['closegroup', 'scheduleclose'],
    description: 'Schedule group closing',
    category: 'group',
    execute: async (conn, message, m, { args, reply, from, isGroup, groupMetadata, sessionId }) => {
        try {
            if (!isGroup) {
                return await reply(`❌ This command can only be used in groups`);
            }

            const { isBotOwner, groupTimers } = require('../server');
            let isAdmin = false;
            
            if (groupMetadata && groupMetadata.participants) {
                const senderJid = m.sender;
                const participant = groupMetadata.participants.find(p => p.id === senderJid);
                isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
            }

            if (!isAdmin && !isBotOwner(conn, message, sessionId)) {
                return await reply(`❌ Admin or owner only command`);
            }

            if (args.length === 0) {
                const prefix = require('../server').PREFIX;
                return await reply(
                    `⏰ *CLOSE TIME*\n\nUsage:\n• ${prefix}closetime [minutes]\n\nExamples:\n${prefix}closetime 5 - Close group in 5 minutes\n${prefix}closetime 0 - Close group immediately\n${prefix}closetime 60 - Close group in 1 hour`
                );
            }

            const minutes = parseInt(args[0]);
            if (isNaN(minutes) || minutes < 0) {
                return await reply(`❌ Please provide a valid number of minutes`);
            }

            const closeTime = minutes * 60 * 1000;

            if (groupTimers.has(from)) {
                clearTimeout(groupTimers.get(from).timeout);
                groupTimers.delete(from);
            }

            groupTimers.set(from, {
                type: 'close',
                timeout: setTimeout(async () => {
                    try {
                        await conn.groupSettingUpdate(from, 'announcement');
                        await conn.sendMessage(from, {
                            text: `🔒 Group has been closed as scheduled.`
                        });
                    } catch (error) {
                        console.error("Error closing group:", error);
                        await conn.sendMessage(from, {
                            text: `❌ Failed to close group: ${error.message}`
                        });
                    } finally {
                        groupTimers.delete(from);
                    }
                }, closeTime)
            });

            await reply(`✅ Group will be closed in ${minutes} minute(s)`);

        } catch (error) {
            console.error('Error in closetime command:', error);
            await reply('❌ Error processing closetime command');
        }
    }
};
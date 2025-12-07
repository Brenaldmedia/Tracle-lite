module.exports = {
    pattern: 'opentime',
    alias: ['opengroup', 'scheduleopen'],
    description: 'Schedule group opening',
    category: 'group',
    execute: async (conn, message, m, { args, reply, from, isGroup, groupMetadata, sessionId }) => {
        try {
            if (!isGroup) {
                return await reply(`❌ This command can only be used in groups`);
            }

            // Check if user is admin or owner
            const { isBotOwner } = require('../server');
            let isAdmin = false;
            
            if (groupMetadata && groupMetadata.participants) {
                const senderJid = m.sender;
                const participant = groupMetadata.participants.find(p => p.id === senderJid);
                isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
            }

            if (!isAdmin && !isBotOwner(conn, message, sessionId)) {
                return await reply(`❌ Admin or owner only command`);
            }

            const prefix = require('../server').PREFIX;

            if (args.length === 0) {
                return await reply(
                    `⏰ *OPEN TIME*\n\nUsage:\n• ${prefix}opentime [minutes]\n\nExamples:\n${prefix}opentime 5 - Open group in 5 minutes\n${prefix}opentime 0 - Open group immediately\n${prefix}opentime 60 - Open group in 1 hour`
                );
            }

            const minutes = parseInt(args[0]);
            if (isNaN(minutes) || minutes < 0) {
                return await reply(`❌ Please provide a valid number of minutes`);
            }

            const { groupTimers } = require('../server');
            const openTime = minutes * 60 * 1000; // Convert to milliseconds

            // Clear existing timer if any
            if (groupTimers.has(from)) {
                clearTimeout(groupTimers.get(from).timeout);
                groupTimers.delete(from);
            }

            // Store the new timer
            groupTimers.set(from, {
                type: 'open',
                timeout: setTimeout(async () => {
                    try {
                        await conn.groupSettingUpdate(from, 'not_announcement');
                        await conn.sendMessage(from, {
                            text: `🔓 Group has been opened as scheduled.`
                        });
                        groupTimers.delete(from);
                    } catch (error) {
                        console.error("Error opening group:", error);
                        await conn.sendMessage(from, {
                            text: `❌ Failed to open group: ${error.message}`
                        });
                        groupTimers.delete(from);
                    }
                }, openTime),
                scheduledTime: Date.now() + openTime
            });

            await reply(
                `✅ Group will be opened in ${minutes} minute(s)\n\nAt: ${new Date(Date.now() + openTime).toLocaleString()}`
            );
        } catch (error) {
            console.error('Error in opentime command:', error);
            await reply('❌ Error processing opentime command');
        }
    }
};
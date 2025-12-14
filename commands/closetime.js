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
                    `⏰ *CLOSE TIME*\n\nUsage:\n• ${prefix}closetime [minutes]\n\nExamples:\n${prefix}closetime 5 - Close group in 5 minutes\n${prefix}closetime 0 - Close group immediately\n${prefix}closetime 60 - Close group in 1 hour`
                );
            }

            const minutes = parseInt(args[0]);
            if (isNaN(minutes) || minutes < 0) {
                return await reply(`❌ Please provide a valid number of minutes`);
            }

            const { groupTimers } = require('../server');
            const closeTime = minutes * 60 * 1000; // Convert to milliseconds

            // Clear existing timer if any
            if (groupTimers.has(from)) {
                clearTimeout(groupTimers.get(from).timeout);
                groupTimers.delete(from);
            }

            // Calculate scheduled time
            const scheduledTime = Date.now() + closeTime;
            
            // Store the new timer
            groupTimers.set(from, {
                type: 'close',
                timeout: setTimeout(async () => {
                    try {
                        await conn.groupSettingUpdate(from, 'announcement');
                        await conn.sendMessage(from, {
                            text: `🔒 Group has been closed as scheduled.`
                        });
                        groupTimers.delete(from);
                    } catch (error) {
                        console.error("Error closing group:", error);
                        await conn.sendMessage(from, {
                            text: `❌ Failed to close group: ${error.message}`
                        });
                        groupTimers.delete(from);
                    }
                }, closeTime),
                scheduledTime: scheduledTime
            });

            // Format time for display with proper timezone handling
            const scheduledDate = new Date(scheduledTime);
            
            // Use UTC time for consistent display
            const utcHours = scheduledDate.getUTCHours();
            const utcMinutes = scheduledDate.getUTCMinutes();
            const utcSeconds = scheduledDate.getUTCSeconds();
            
            // Calculate local time
            const localHours = scheduledDate.getHours();
            const localMinutes = scheduledDate.getMinutes();
            
            // Format time strings
            const utcTime = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:${utcSeconds.toString().padStart(2, '0')} UTC`;
            const localTime = `${localHours.toString().padStart(2, '0')}:${localMinutes.toString().padStart(2, '0')} Local`;
            
            await reply(
                `✅ *Group will be closed in ${minutes} minute(s)*\n\n` +
                `⏰ *Scheduled Time:*\n` +
                `• ${scheduledDate.toLocaleDateString()}\n` +
                `• ${localTime}\n` +
                `• (${utcTime})\n\n` +
                `📅 Full date: ${scheduledDate.toString()}`
            );
        } catch (error) {
            console.error('Error in closetime command:', error);
            await reply('❌ Error processing closetime command');
        }
    }
};
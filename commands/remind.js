module.exports = {
    pattern: "remind",
    alias: ["reminder", "remindme"],
    desc: "Set reminders (supports seconds, minutes, hours, days)",
    category: "utility",
    react: "⏰",
    filename: __filename,
    use: "[time] [message]",
    
    execute: async (conn, message, m, { from, reply, args, sender, sessionId, PREFIX, getUserSettings, updateUserSettings }) => {
        if (args.length < 2) {
            return reply(`⏰ *Reminder System*\n\n*Usage:* ${PREFIX}remind [time] [message]\n\n*Examples:*\n• ${PREFIX}remind 30s Take a breath\n• ${PREFIX}remind 5m Meeting at 3 PM\n• ${PREFIX}remind 2h Call mom\n• ${PREFIX}remind 1d Pay bills\n• ${PREFIX}remind list\n• ${PREFIX}remind remove [number]\n\n*Time formats:*\n• s = seconds (5s, 30s, 45s)\n• m = minutes (5m, 30m, 2m)\n• h = hours (2h, 12h, 24h)\n• d = days (1d, 7d, 30d)`);
        }
        
        const subcmd = args[0]?.toLowerCase();
        
        // Handle list command
        if (subcmd === 'list') {
            const userSettings = getUserSettings(sessionId);
            const reminders = userSettings.reminders || [];
            
            if (reminders.length === 0) {
                return reply(`📝 *No reminders set.*\n\nUse ${PREFIX}remind [time] [message] to create one.\n\n*Example:* ${PREFIX}remind 5m Call John`);
            }
            
            let list = `⏰ *YOUR REMINDERS*\n\n`;
            list += `📊 *Total:* ${reminders.length}\n`;
            list += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            reminders.forEach((reminder, index) => {
                const timeLeft = Math.max(0, reminder.time - Date.now());
                const secondsLeft = Math.floor(timeLeft / 1000);
                const minutesLeft = Math.floor(secondsLeft / 60);
                const hoursLeft = Math.floor(minutesLeft / 60);
                const daysLeft = Math.floor(hoursLeft / 24);
                
                let timeLeftText = '';
                if (daysLeft > 0) timeLeftText = `${daysLeft}d ${hoursLeft % 24}h`;
                else if (hoursLeft > 0) timeLeftText = `${hoursLeft}h ${minutesLeft % 60}m`;
                else if (minutesLeft > 0) timeLeftText = `${minutesLeft}m ${secondsLeft % 60}s`;
                else timeLeftText = `${secondsLeft}s`;
                
                list += `${index + 1}. 📝 *${reminder.message.substring(0, 40)}*\n`;
                list += `   ⏰ In: ${timeLeftText}\n`;
                list += `   🗓️ ${new Date(reminder.time).toLocaleString()}\n\n`;
            });
            
            list += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            list += `💡 Use ${PREFIX}remind remove [number] to delete.\n`;
            list += `⚡ Powered by Tracle-Lite`;
            
            return reply(list);
        }
        
        // Handle remove command
        if (subcmd === 'remove') {
            const index = parseInt(args[1]) - 1;
            
            if (isNaN(index) || index < 0) {
                return reply(`❌ *Usage:* ${PREFIX}remind remove [number]\n\nUse ${PREFIX}remind list to see your reminders.`);
            }
            
            const userSettings = getUserSettings(sessionId);
            const reminders = userSettings.reminders || [];
            
            if (index >= reminders.length) {
                return reply(`❌ Invalid reminder number. Use ${PREFIX}remind list to see your reminders.`);
            }
            
            const removed = reminders.splice(index, 1)[0];
            updateUserSettings(sessionId, { reminders: reminders });
            
            return reply(`✅ *Reminder removed!*\n\n📝 "${removed.message.substring(0, 50)}"\n\n⚡ Powered by Tracle-Lite`);
        }
        
        // Parse time for new reminder
        const timeStr = args[0].toLowerCase();
        const reminderText = args.slice(1).join(' ');
        
        let milliseconds = 0;
        let timeUnit = '';
        
        // Parse time - supports s, m, h, d
        if (timeStr.endsWith('s')) {
            const seconds = parseInt(timeStr.slice(0, -1));
            if (isNaN(seconds)) return reply(`❌ Invalid time format. Use: 5s, 30s, 2m, 1h, 1d`);
            milliseconds = seconds * 1000;
            timeUnit = `${seconds} second${seconds !== 1 ? 's' : ''}`;
        } else if (timeStr.endsWith('m')) {
            const minutes = parseInt(timeStr.slice(0, -1));
            if (isNaN(minutes)) return reply(`❌ Invalid time format. Use: 5s, 30s, 2m, 1h, 1d`);
            milliseconds = minutes * 60 * 1000;
            timeUnit = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (timeStr.endsWith('h')) {
            const hours = parseInt(timeStr.slice(0, -1));
            if (isNaN(hours)) return reply(`❌ Invalid time format. Use: 5s, 30s, 2m, 1h, 1d`);
            milliseconds = hours * 60 * 60 * 1000;
            timeUnit = `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (timeStr.endsWith('d')) {
            const days = parseInt(timeStr.slice(0, -1));
            if (isNaN(days)) return reply(`❌ Invalid time format. Use: 5s, 30s, 2m, 1h, 1d`);
            milliseconds = days * 24 * 60 * 60 * 1000;
            timeUnit = `${days} day${days !== 1 ? 's' : ''}`;
        } else {
            return reply(`❌ Invalid time format. Use: 5s, 30s, 2m, 1h, 1d\n\n*Examples:*\n• ${PREFIX}remind 30s Take a breath\n• ${PREFIX}remind 5m Meeting\n• ${PREFIX}remind 2h Call mom\n• ${PREFIX}remind 1d Pay bills`);
        }
        
        if (milliseconds <= 0 || milliseconds > 30 * 24 * 60 * 60 * 1000) {
            return reply(`❌ Time must be between 1 second and 30 days.`);
        }
        
        const reminderTime = Date.now() + milliseconds;
        
        // Store reminder in user settings
        const userSettings = getUserSettings(sessionId);
        const reminders = userSettings.reminders || [];
        
        const newReminder = {
            message: reminderText,
            time: reminderTime,
            createdAt: Date.now(),
            from: from,
            sender: sender
        };
        
        reminders.push(newReminder);
        updateUserSettings(sessionId, { reminders: reminders });
        
        // Show countdown in response
        const inTime = timeUnit;
        
        await reply(`✅ *Reminder set!*\n\n⏰ *In:* ${inTime}\n📝 *What:* ${reminderText}\n🕐 *At:* ${new Date(reminderTime).toLocaleTimeString()}\n📊 *Total reminders:* ${reminders.length}\n\nI'll remind you!`);
        
        // Set timeout for this reminder
        setTimeout(async () => {
            try {
                // Check if reminder still exists (not removed)
                const currentSettings = getUserSettings(sessionId);
                const currentReminders = currentSettings.reminders || [];
                const stillExists = currentReminders.some(r => r.time === reminderTime && r.message === reminderText);
                
                if (stillExists) {
                    await conn.sendMessage(sender, {
                        text: `⏰ *REMINDER*\n\n📝 "${reminderText}"\n\n🗓️ Set: ${new Date(newReminder.createdAt).toLocaleString()}\n\n⚡ Powered by Tracle-Lite`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: "120363401559573199@newsletter",
                                newsletterName: "BrenaldMedia",
                                serverMessageId: -1,
                            }
                        }
                    });
                    
                    // Remove reminder after sending
                    const updatedReminders = currentReminders.filter(r => !(r.time === reminderTime && r.message === reminderText));
                    updateUserSettings(sessionId, { reminders: updatedReminders });
                    console.log(`✅ Reminder sent and removed for ${sessionId}: "${reminderText}"`);
                }
            } catch (error) {
                console.error("Failed to send reminder:", error);
            }
        }, milliseconds);
    }
};
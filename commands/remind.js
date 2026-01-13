module.exports = {
    pattern: "remind",
    desc: "Set reminders",
    category: "utility",
    react: "⏰",
    filename: __filename,
    use: "[time] [message]",
    
    execute: async (conn, message, m, { from, reply, args, sender }) => {
        if (args.length < 2) {
            return reply(`⏰ *Reminder System*\n\nUsage: ${PREFIX}remind [time] [message]\n\nExamples:\n• ${PREFIX}remind 30m Meeting at 3 PM\n• ${PREFIX}remind 2h Take medicine\n• ${PREFIX}remind 1d Call mom`);
        }
        
        const timeStr = args[0].toLowerCase();
        const reminderText = args.slice(1).join(' ');
        
        let milliseconds = 0;
        
        // Parse time
        if (timeStr.endsWith('m')) {
            const minutes = parseInt(timeStr);
            milliseconds = minutes * 60 * 1000;
        } else if (timeStr.endsWith('h')) {
            const hours = parseInt(timeStr);
            milliseconds = hours * 60 * 60 * 1000;
        } else if (timeStr.endsWith('d')) {
            const days = parseInt(timeStr);
            milliseconds = days * 24 * 60 * 60 * 1000;
        } else {
            return reply(`❌ Invalid time format. Use: 30m, 2h, 1d`);
        }
        
        if (isNaN(milliseconds) || milliseconds <= 0) {
            return reply(`❌ Invalid time value.`);
        }
        
        const reminderTime = new Date(Date.now() + milliseconds);
        
        await reply(`✅ Reminder set!\n\n⏰ *When:* ${reminderTime.toLocaleString()}\n📝 *What:* ${reminderText}\n\nI'll remind you!`);
        
        // Store reminder (simplified)
        setTimeout(async () => {
            try {
                await conn.sendMessage(sender, {
                    text: `⏰ *REMINDER*\n\n"${reminderText}"\n\nSet: ${new Date().toLocaleString()}`
                });
            } catch (error) {
                console.error("Failed to send reminder:", error);
            }
        }, milliseconds);
    }
};
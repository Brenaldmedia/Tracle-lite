module.exports = {
    pattern: "analyze",
    desc: "Analyze chat/group statistics",
    category: "utility",
    react: "📊",
    filename: __filename,
    use: "<reply to chat>",
    
    execute: async (conn, message, m, { from, reply, isGroup }) => {
        try {
            if (!isGroup) {
                return reply(`📊 This command only works in groups.`);
            }
            
            await reply(`📊 Analyzing group data...`);
            
            const groupMetadata = await conn.groupMetadata(from);
            const participants = groupMetadata.participants;
            
            // Count admin types
            let superadmins = 0;
            let admins = 0;
            let members = 0;
            
            participants.forEach(p => {
                if (p.admin === 'superadmin') superadmins++;
                else if (p.admin === 'admin') admins++;
                else members++;
            });
            
            // Calculate activity (simplified)
            const creationDate = new Date(groupMetadata.creation * 1000);
            const daysActive = Math.floor((Date.now() - creationDate) / (1000 * 60 * 60 * 24));
            
            const analysis = `📊 *GROUP ANALYSIS*\n\n` +
                           `🏷️ *Name:* ${groupMetadata.subject}\n` +
                           `👥 *Total Members:* ${participants.length}\n\n` +
                           `👑 *Super Admins:* ${superadmins}\n` +
                           `🛡️ *Admins:* ${admins}\n` +
                           `👤 *Members:* ${members}\n\n` +
                           `📅 *Created:* ${creationDate.toLocaleDateString()}\n` +
                           `⏳ *Active for:* ${daysActive} days\n\n` +
                           `📈 *Activity Level:* ${participants.length > 50 ? 'High' : participants.length > 20 ? 'Medium' : 'Low'}`;
            
            await reply(analysis);
            
        } catch (error) {
            console.error("Analyze error:", error);
            await reply(`❌ Failed to analyze group: ${error.message}`);
        }
    }
};
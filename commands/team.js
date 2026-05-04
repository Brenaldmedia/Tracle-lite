const axios = require("axios");

module.exports = {
    pattern: "team",
    alias: ["searchteam", "findteam"],
    category: "sports",
    description: "Search for any sport team",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🏆 *Team Search*\n\nUsage: .team [team name]\nExample: .team Arsenal\n\n> ⚡ Powered by TRACLE-LITE`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/sports/team?q=${encodeURIComponent(q)}`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not find team "${q}".\n> ⚡ Powered by TRACLE-LITE`);
            }

            const teams = response.data.result || [];
            let message = `🏆 *TEAM SEARCH RESULTS* 🏆\n🔍 *Query:* ${q}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            teams.slice(0, 10).forEach(team => {
                message += `*${team.name || team.team}*\n`;
                if (team.league) message += `└ League: ${team.league}\n`;
                if (team.country) message += `└ Country: ${team.country}\n`;
                if (team.stadium) message += `└ Stadium: ${team.stadium}\n`;
                message += `\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by TRACLE-LITE`;
            
            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            
        } catch (error) {
            console.error("Error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> ⚡ Powered by TRACLE-LITE`);
        }
    }
};
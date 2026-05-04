const axios = require("axios");

module.exports = {
    pattern: "epl",
    alias: ["premierleague", "epltable"],
    category: "sports",
    description: "Get EPL standings",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "🏆", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/epl/standings`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch EPL standings.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const standings = response.data.result.standings;
            let message = `🏆 *PREMIER LEAGUE STANDINGS* 🏆\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            standings.forEach(team => {
                const icon = team.position === 1 ? "👑" : (team.position <= 4 ? "⭐" : "📌");
                message += `${icon} *${team.position}.* ${team.team}\n`;
                message += `   └ ${team.points} pts | ${team.played} games | ${team.won}W ${team.draw}D ${team.lost}L\n`;
                message += `   └ ⚽ ${team.goalsFor}:${team.goalsAgainst} (${team.goalDifference > 0 ? '+' : ''}${team.goalDifference})\n\n`;
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
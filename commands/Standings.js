const axios = require("axios");

module.exports = {
    pattern: "standings",
    alias: ["standings", "table", "premierleague"],
    category: "sports",
    description: "Get Premier League standings",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "🏆", key: mek.key } });
            
            console.log(`\n🏆 Fetching EPL standings...`);
            await reply(`📊 Fetching Premier League standings...`);

            const response = await axios.get(`https://apiskeith.top/epl/standings`, { timeout: 15000 });

            if (!response.data?.status || !response.data?.result?.standings) {
                return reply(`❌ Could not fetch standings.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const standings = response.data.result.standings;
            
            let message = `🏆 *PREMIER LEAGUE STANDINGS* 🏆\n📅 *Season:* 2025/26\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            standings.forEach(team => {
                let positionIcon = team.position === 1 ? "👑 " : (team.position <= 4 ? "⭐ " : (team.position <= 17 ? "📌 " : "⚠️ "));
                
                message += `${positionIcon}*${team.position}.* ${team.team}\n`;
                message += `   └ 📊 ${team.points} pts | ${team.played} games | ${team.won}W ${team.draw}D ${team.lost}L\n`;
                message += `   └ ⚽ ${team.goalsFor}:${team.goalsAgainst} (${team.goalDifference > 0 ? '+' : ''}${team.goalDifference})\n\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by TRACLE-LITE`;
            
            if (message.length > 4096) {
                const parts = message.match(/[\s\S]{1,4000}/g) || [];
                for (const part of parts) {
                    await conn.sendMessage(from, { text: part }, { quoted: mek });
                }
            } else {
                await conn.sendMessage(from, { text: message }, { quoted: mek });
            }
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> ⚡ Powered by TRACLE-LITE`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
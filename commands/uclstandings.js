const axios = require("axios");

module.exports = {
    pattern: "ucl",
    alias: ["championsleague", "ucltable"],
    category: "sports",
    description: "Get UEFA Champions League standings",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "🏆", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/ucl/standings`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch UCL standings.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const standings = response.data.result?.standings || [];
            let message = `🏆 *UEFA CHAMPIONS LEAGUE STANDINGS* 🏆\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            standings.slice(0, 10).forEach(team => {
                const icon = team.position === 1 ? "👑" : (team.position <= 4 ? "⭐" : "📌");
                message += `${icon} *${team.position}.* ${team.team}\n`;
                message += `   └ ${team.points} pts | ${team.played} games\n\n`;
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
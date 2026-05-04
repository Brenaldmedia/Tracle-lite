const axios = require("axios");

module.exports = {
    pattern: "bundesliga",
    alias: ["buliga", "bundesligatable"],
    category: "sports",
    description: "Get Bundesliga standings",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "🏆", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/bundesliga/standings`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch Bundesliga standings.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const standings = response.data.result?.standings || [];
            let message = `🏆 *BUNDESLIGA STANDINGS* 🏆\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            standings.slice(0, 10).forEach(team => {
                const icon = team.position === 1 ? "👑" : (team.position <= 4 ? "⭐" : "📌");
                message += `${icon} *${team.position}.* ${team.team}\n`;
                message += `   └ ${team.points} pts | ${team.played} games | ${team.won}W ${team.draw}D ${team.lost}L\n\n`;
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
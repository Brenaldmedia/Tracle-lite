const axios = require("axios");

module.exports = {
    pattern: "euros",
    alias: ["euro", "euros2024"],
    category: "sports",
    description: "Get Euros standings",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "🏆", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/euros/standings`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch Euros standings.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const standings = response.data.result?.standings || [];
            let message = `🏆 *EUROS STANDINGS* 🏆\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            standings.slice(0, 10).forEach(team => {
                message += `*${team.position}.* ${team.team}\n`;
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
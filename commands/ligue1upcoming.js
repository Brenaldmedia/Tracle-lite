const axios = require("axios");

module.exports = {
    pattern: "ligue1upcoming",
    alias: ["ligue1fixtures"],
    category: "sports",
    description: "Get upcoming Ligue 1 matches",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "📅", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/ligue1/upcoming`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch upcoming Ligue 1 matches.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const matches = response.data.result || [];
            let message = `📅 *UPCOMING LIGUE 1 FIXTURES* 📅\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            matches.slice(0, 15).forEach(match => {
                message += `${match.home_team || match.p1} vs ${match.away_team || match.p2}\n`;
                message += `└ 🕒 ${match.date || match.tm || 'TBD'}\n\n`;
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
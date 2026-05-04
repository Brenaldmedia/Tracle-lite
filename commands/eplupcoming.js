const axios = require("axios");

module.exports = {
    pattern: "eplupcoming",
    alias: ["eplfixtures", "premfixtures"],
    category: "sports",
    description: "Get upcoming EPL matches",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "📅", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/epl/upcoming`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch upcoming EPL matches.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const matches = response.data.result || [];
            let message = `📅 *UPCOMING EPL FIXTURES* 📅\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
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
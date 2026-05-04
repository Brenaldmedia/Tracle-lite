const axios = require("axios");

module.exports = {
    pattern: "highlights",
    alias: ["hl", "matchhighlights"],
    category: "sports",
    description: "Get live scores with highlights",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "🎥", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/livescore/highlights`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch highlights.\n> ⚡ Powered by TRACLE-LITE`);
            }

            let message = `🎥 *LIVE SCORES WITH HIGHLIGHTS* 🎥\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            const games = response.data.result?.games || {};
            const gamesList = Object.values(games);
            
            gamesList.slice(0, 10).forEach(game => {
                message += `⚽ ${game.p1} vs ${game.p2}\n`;
                message += `📊 Score: ${game.R?.r1 || 0} - ${game.R?.r2 || 0}\n\n`;
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
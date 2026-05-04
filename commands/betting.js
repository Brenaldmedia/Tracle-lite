const axios = require("axios");

module.exports = {
    pattern: "betting",
    alias: ["tips", "bettingtips", "odds"],
    category: "sports",
    description: "Get sure bet tips odds",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "💰", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/sports/betting`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch betting tips.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const tips = response.data.result || [];
            let message = `💰 *BETTING TIPS & ODDS* 💰\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            tips.slice(0, 10).forEach(tip => {
                message += `⚽ *${tip.match || tip.fixture}*\n`;
                if (tip.prediction) message += `📊 Prediction: ${tip.prediction}\n`;
                if (tip.odds) message += `🎯 Odds: ${tip.odds}\n`;
                message += `\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━━━━━\n⚠️ *Disclaimer:* Bet responsibly\n⚡ Powered by TRACLE-LITE`;
            
            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            
        } catch (error) {
            console.error("Error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> ⚡ Powered by TRACLE-LITE`);
        }
    }
};
const axios = require("axios");

module.exports = {
    pattern: "eurosscorers",
    alias: ["eurosgoals"],
    category: "sports",
    description: "Get Euros top scorers",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "⚽", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/euros/scorers`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch Euros scorers.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const scorers = response.data.result?.topScorers || [];
            let message = `⚽ *EUROS TOP SCORERS* ⚽\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            scorers.slice(0, 10).forEach(scorer => {
                message += `${scorer.rank}. *${scorer.player}*\n`;
                message += `   └ ${scorer.team}\n`;
                message += `   └ ⚽ ${scorer.goals} goals\n\n`;
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
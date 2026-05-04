const axios = require("axios");

module.exports = {
    pattern: "eplscorers",
    alias: ["eplgoals", "premierscorers"],
    category: "sports",
    description: "Get EPL top scorers",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "⚽", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/epl/scorers`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch EPL scorers.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const scorers = response.data.result.topScorers;
            let message = `⚽ *EPL TOP SCORERS* ⚽\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            scorers.forEach(scorer => {
                let medal = scorer.rank === 1 ? "🥇" : (scorer.rank === 2 ? "🥈" : (scorer.rank === 3 ? "🥉" : `${scorer.rank}.`));
                message += `${medal} *${scorer.player}*\n`;
                message += `   └ ${scorer.team}\n`;
                message += `   └ ⚽ ${scorer.goals} goals`;
                if (scorer.assists !== "N/A") message += ` | 🎯 ${scorer.assists} assists`;
                if (scorer.penalties !== "N/A") message += ` | ⚡ ${scorer.penalties} pens`;
                message += `\n\n`;
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
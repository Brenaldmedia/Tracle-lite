const axios = require("axios");

module.exports = {
    pattern: "score",
    alias: ["topscorers", "goldenboot", "goals"],
    category: "sports",
    description: "Get Premier League top scorers",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "⚽", key: mek.key } });
            
            console.log(`\n🥅 Fetching Premier League top scorers...`);
            await reply(`📊 Fetching top scorers...`);

            const response = await axios.get(`https://apiskeith.top/epl/scorers`, { timeout: 15000 });

            if (!response.data?.status || !response.data?.result?.topScorers) {
                return reply(`❌ Could not fetch top scorers.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const data = response.data.result;
            const scorers = data.topScorers;
            
            let message = `⚽ *PREMIER LEAGUE TOP SCORERS* ⚽\n🏆 *Season:* 2025/26\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            scorers.forEach(scorer => {
                const rank = scorer.rank;
                const player = scorer.player;
                const team = scorer.team;
                const goals = scorer.goals;
                const assists = scorer.assists;
                const penalties = scorer.penalties;
                
                // Medal emoji for top 3
                let medal = "";
                if (rank === 1) medal = "🥇 ";
                else if (rank === 2) medal = "🥈 ";
                else if (rank === 3) medal = "🥉 ";
                else medal = `${rank}. `;
                
                message += `${medal}*${player}*\n`;
                message += `   └ ${team}\n`;
                message += `   └ ⚽ ${goals} goals`;
                
                if (assists !== "N/A" && assists > 0) {
                    message += ` | 🎯 ${assists} assists`;
                }
                
                if (penalties !== "N/A" && penalties > 0) {
                    message += ` | ⚡ ${penalties} penalties`;
                }
                
                message += `\n\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━━━━━\n`;
            message += `👑 *Golden Boot Leader:* ${scorers[0]?.player} (${scorers[0]?.goals} goals)\n`;
            message += `⚡ Powered by TRACLE-LITE`;
            
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
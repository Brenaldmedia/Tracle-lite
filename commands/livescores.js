const axios = require("axios");

module.exports = {
    pattern: "livescore",
    alias: ["live", "scores", "football"],
    category: "sports",
    description: "Get live football scores",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "⚽", key: mek.key } });
            
            console.log(`\n🔴 Fetching live scores...`);
            await reply(`📡 Fetching live scores...`);

            const response = await axios.get(`https://apiskeith.top/livescore`, { timeout: 15000 });

            if (!response.data?.status || !response.data?.result?.games) {
                return reply(`❌ Could not fetch live scores.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const games = response.data.result.games;
            const gamesList = Object.values(games);
            const todayGames = gamesList.filter(game => game.dt === "2026-05-03");
            
            if (todayGames.length === 0) {
                return reply(`📅 No matches scheduled for today.\n> ⚡ Powered by TRACLE-LITE`);
            }

            // Group by competition
            const grouped = {};
            todayGames.forEach(game => {
                const compCode = game.cm;
                if (!grouped[compCode]) grouped[compCode] = [];
                grouped[compCode].push(game);
            });

            let message = `⚽ *LIVE SCORES* ⚽\n📅 *Date:* May 3, 2026\n━━━━━━━━━━━━━━━━━━━━\n\n`;

            for (const [comp, compGames] of Object.entries(grouped)) {
                let leagueName = {
                    "15": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League",
                    "14": "🇪🇸 La Liga", 
                    "13": "🇮🇹 Serie A",
                    "11": "🇩🇪 Bundesliga",
                    "10": "🇫🇷 Ligue 1",
                    "16": "🇳🇱 Eredivisie"
                }[comp] || `⚽ League ${comp}`;
                
                message += `*${leagueName}*\n━━━━━━━━━━━━━━━━━━━━\n`;
                
                compGames.forEach(game => {
                    const homeScore = game.R?.r1 || "0";
                    const awayScore = game.R?.r2 || "0";
                    let statusIcon = {
                        "FT": "✅ FT",
                        "HT": "⏸️ HT", 
                        "1T": "⏳ 1st Half",
                        "2T": "⏳ 2nd Half"
                    }[game.R?.st] || `🕒 ${game.tm}`;
                    
                    message += `${game.p1} ${homeScore} - ${awayScore} ${game.p2}\n└ ${statusIcon}\n\n`;
                });
                message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            }
            
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
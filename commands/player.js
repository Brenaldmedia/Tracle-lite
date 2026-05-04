const axios = require("axios");

module.exports = {
    pattern: "player",
    alias: ["searchplayer", "findplayer"],
    category: "sports",
    description: "Search for any sport player",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`⚽ *Player Search*\n\nUsage: .player [player name]\nExample: .player Messi\n\n> ⚡ Powered by TRACLE-LITE`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/sports/player?q=${encodeURIComponent(q)}`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not find player "${q}".\n> ⚡ Powered by TRACLE-LITE`);
            }

            const players = response.data.result || [];
            let message = `⚽ *PLAYER SEARCH RESULTS* ⚽\n🔍 *Query:* ${q}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            players.slice(0, 10).forEach(player => {
                message += `*${player.name || player.player}*\n`;
                if (player.team) message += `└ Team: ${player.team}\n`;
                if (player.nationality) message += `└ Country: ${player.nationality}\n`;
                if (player.position) message += `└ Position: ${player.position}\n`;
                message += `\n`;
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
const axios = require("axios");

module.exports = {
    pattern: "uclmatches",
    alias: ["championsmatches", "uclresults"],
    category: "sports",
    description: "Get UCL match results",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "📋", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/ucl/matches`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch UCL matches.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const matches = response.data.result || [];
            let message = `📋 *UCL MATCH RESULTS* 📋\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            matches.slice(0, 15).forEach(match => {
                message += `${match.home_team || match.p1} ${match.home_score || match.r1 || 0} - ${match.away_score || match.r2 || 0} ${match.away_team || match.p2}\n\n`;
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
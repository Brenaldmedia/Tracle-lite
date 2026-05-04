const axios = require("axios");

module.exports = {
    pattern: "events",
    alias: ["gameevents", "matchhistory"],
    category: "sports",
    description: "Search for game events history",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📋 *Game Events*\n\nUsage: .events [match]\nExample: .events Arsenal vs Chelsea\n\n> ⚡ Powered by TRACLE-LITE`);
            }

            await conn.sendMessage(from, { react: { text: "📋", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/sports/events?q=${encodeURIComponent(q)}`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not find events for "${q}".\n> ⚡ Powered by TRACLE-LITE`);
            }

            const events = response.data.result || [];
            let message = `📋 *MATCH EVENTS* 📋\n🔍 *Match:* ${q}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            events.forEach(event => {
                message += `⏱️ ${event.time || event.minute}': ${event.event || event.description}\n`;
                message += `   ${event.player || ''} ${event.team ? `(${event.team})` : ''}\n\n`;
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
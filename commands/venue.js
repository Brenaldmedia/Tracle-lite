const axios = require("axios");

module.exports = {
    pattern: "venue",
    alias: ["stadium", "ground"],
    category: "sports",
    description: "Search for stadium/venue information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🏟️ *Venue Search*\n\nUsage: .venue [stadium name]\nExample: .venue Emirates\n\nOther examples:\n• .venue Wembley\n• .venue Camp Nou\n• .venue Old Trafford\n\n> ⚡ Powered by TRACLE-LITE`);
            }

            await conn.sendMessage(from, { react: { text: "🏟️", key: mek.key } });
            
            console.log(`\n🏟️ Searching venue: ${q}`);
            await reply(`🔍 Searching for *${q}* stadium...`);

            const response = await axios.get(`https://apiskeith.top/sport/venuesearch?q=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status || !response.data?.result || response.data.result.length === 0) {
                return reply(`❌ No venue found for "${q}"\n\nTry a different stadium name.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const venue = response.data.result[0];
            
            let message = `🏟️ *VENUE INFORMATION* 🏟️\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `*🏟️ Name:* ${venue.name}\n`;
            if (venue.alternateName) message += `*📛 Also known as:* ${venue.alternateName}\n`;
            message += `*⚽ Sport:* ${venue.sport}\n`;
            message += `*📍 Location:* ${venue.location}, ${venue.country}\n`;
            message += `*👥 Capacity:* ${venue.capacity.toLocaleString()}\n`;
            message += `*🕐 Timezone:* ${venue.timezone}\n\n`;
            
            if (venue.description) {
                const shortDesc = venue.description.length > 300 
                    ? venue.description.substring(0, 300) + "..." 
                    : venue.description;
                message += `*📝 Description:*\n${shortDesc}\n\n`;
            }
            
            message += `━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by TRACLE-LITE`;
            
            await conn.sendMessage(from, { text: message }, { quoted: mek });
            
            if (venue.media?.thumb) {
                try {
                    await conn.sendMessage(from, {
                        image: { url: venue.media.thumb },
                        caption: `🏟️ ${venue.name}`
                    }, { quoted: mek });
                } catch (e) {
                    console.log("Could not send thumbnail");
                }
            }
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> ⚡ Powered by TRACLE-LITE`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
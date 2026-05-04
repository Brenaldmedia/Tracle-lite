const axios = require("axios");

module.exports = {
    pattern: "iplookup",
    alias: ["ip", "ipinfo"],
    category: "stalker",
    description: "Lookup IP address information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🌐 *IP Lookup*\n\nUsage: .iplookup [IP address]\nExample: .iplookup 8.8.8.8\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🌐", key: mek.key } });
            await reply(`🔍 Looking up IP *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/ip?ip=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ IP "${q}" not found or invalid.\n> Powered by Tracle-Lite`);
            }

            const data = response.data.result;
            
            let message = `🌐 *IP LOOKUP* 🌐\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `📡 *IP:* ${data.ip || q}\n`;
            message += `📍 *Country:* ${data.country || 'N/A'}\n`;
            message += `🏙️ *City:* ${data.city || 'N/A'}\n`;
            message += `📮 *Postal:* ${data.postal || 'N/A'}\n`;
            message += `🗺️ *Region:* ${data.region || 'N/A'}\n`;
            message += `📞 *ISP:* ${data.isp || 'N/A'}\n`;
            message += `📍 *Coordinates:* ${data.loc || `${data.latitude}, ${data.longitude}` || 'N/A'}\n`;
            message += `⏰ *Timezone:* ${data.timezone || 'N/A'}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("IP Lookup error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
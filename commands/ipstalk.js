const axios = require("axios");

module.exports = {
    pattern: "ipstalk",
    alias: ["ipaddress", "ipdetails"],
    category: "stalker",
    description: "Get detailed IP address information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🌐 *IP Address Stalk*\n\nUsage: .ipstalk [IP address]\nExample: .ipstalk 8.8.8.8\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🌐", key: mek.key } });
            await reply(`🔍 Analyzing IP *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/ip-address?ip=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ IP "${q}" not found.\n> Powered by Tracle-Lite`);
            }

            const data = response.data.result;
            
            let message = `🌐 *IP ADDRESS STALK* 🌐\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `📡 *IP:* ${data.ip || q}\n`;
            message += `📍 *Country:* ${data.country || data.country_name || 'N/A'}\n`;
            message += `🏙️ *City:* ${data.city || 'N/A'}\n`;
            message += `🗺️ *Region:* ${data.region || data.region_name || 'N/A'}\n`;
            message += `📞 *ISP:* ${data.isp || data.org || 'N/A'}\n`;
            message += `📍 *Coordinates:* ${data.loc || `${data.latitude}, ${data.longitude}` || 'N/A'}\n`;
            message += `🌐 *ASN:* ${data.asn || data.as || 'N/A'}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("IP Stalk error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
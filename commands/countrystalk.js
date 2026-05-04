const axios = require("axios");

module.exports = {
    pattern: "countrystalk",
    alias: ["country", "countryinfo"],
    category: "stalker",
    description: "Get country information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🌍 *Country Info*\n\nUsage: .countrystalk [country name]\nExample: .countrystalk Nigeria\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🌍", key: mek.key } });
            await reply(`🔍 Looking up country *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/country?country=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Country "${q}" not found.\n> Powered by Tracle-Lite`);
            }

            const country = response.data.result;
            
            let message = `🌍 *COUNTRY INFORMATION* 🌍\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `🏳️ *Name:* ${country.name || country.country || q}\n`;
            message += `🏙️ *Capital:* ${country.capital || 'N/A'}\n`;
            message += `👥 *Population:* ${country.population?.toLocaleString() || 'N/A'}\n`;
            message += `🗣️ *Languages:* ${country.languages || 'N/A'}\n`;
            message += `💰 *Currency:* ${country.currency || 'N/A'}\n`;
            message += `📅 *Area:* ${country.area?.toLocaleString() || 'N/A'} km²\n`;
            message += `🌐 *Domain:* ${country.tld || 'N/A'}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            
            if (country.flag) {
                try {
                    await conn.sendMessage(from, { image: { url: country.flag }, caption: `🏳️ ${country.name || q}` }, { quoted: mek });
                } catch (e) {}
            }
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Country Info error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
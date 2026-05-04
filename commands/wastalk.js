const axios = require("axios");

module.exports = {
    pattern: "wastalk",
    alias: ["whatsappstalk", "wastalker"],
    category: "stalker",
    description: "Stalk WhatsApp channel information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📢 *WhatsApp Channel Stalk*\n\nUsage: .wastalk [channel ID or link]\nExample: .wastalk 120363401559573199\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
            await reply(`🔍 Searching WhatsApp channel *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/whatsapp-channel?channel=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Channel "${q}" not found.\n> Powered by Tracle-Lite`);
            }

            const channel = response.data.result;
            
            let message = `📢 *WHATSAPP CHANNEL STALK* 📢\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `📛 *Name:* ${channel.name || 'N/A'}\n`;
            message += `🆔 *Channel ID:* ${channel.id || q}\n`;
            message += `👥 *Subscribers:* ${channel.subscriberCount?.toLocaleString() || 'Private'}\n`;
            message += `📝 *Description:* ${channel.description || 'No description'}\n`;
            if (channel.verified) message += `✅ *Verified:* Yes\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("WhatsApp Channel Stalk error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
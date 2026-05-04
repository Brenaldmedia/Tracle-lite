const axios = require("axios");

module.exports = {
    pattern: "ytstalk",
    alias: ["youtubestalk", "channelstalk"],
    category: "stalker",
    description: "Stalk YouTube channel information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📺 *YouTube Stalk*\n\nUsage: .ytstalk [channel username or ID]\nExample: .ytstalk MrBeast\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
            await reply(`🔍 Searching YouTube channel *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/youtube?channel=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Channel "${q}" not found.\n> Powered by Tracle-Lite`);
            }

            const channel = response.data.result;
            
            let message = `📺 *YOUTUBE CHANNEL STALK* 📺\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `📛 *Name:* ${channel.title || q}\n`;
            message += `🆔 *Channel ID:* ${channel.id || 'N/A'}\n`;
            message += `📝 *Description:* ${channel.description ? channel.description.substring(0, 200) + '...' : 'No description'}\n`;
            message += `👥 *Subscribers:* ${channel.subscriberCount?.toLocaleString() || 0}\n`;
            message += `🎬 *Videos:* ${channel.videoCount?.toLocaleString() || 0}\n`;
            message += `👀 *Views:* ${channel.viewCount?.toLocaleString() || 0}\n`;
            message += `🔗 *URL:* ${channel.url || `https://youtube.com/@${q}`}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            
            if (channel.thumbnail) {
                try {
                    await conn.sendMessage(from, { image: { url: channel.thumbnail }, caption: `📺 ${channel.title}` }, { quoted: mek });
                } catch (e) {}
            }
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("YouTube Stalk error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
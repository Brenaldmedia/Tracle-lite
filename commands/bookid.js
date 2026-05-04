const axios = require("axios");

module.exports = {
    pattern: "xvideos",
    alias: ["xvideo", "searchxvideo"],
    category: "search",
    description: "Search for videos",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🎬 *Video Search*\n\nUsage: .xvideos [search term]\nExample: .xvideos cat\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });
            await reply(`🔍 Searching for videos: *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/search/xvideos?q=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ No videos found for "${q}".\n> Powered by Tracle-Lite`);
            }

            const videos = response.data.result || [];
            
            let message = `🎬 *VIDEO SEARCH RESULTS* 🎬\n🔍 *Query:* ${q}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            videos.slice(0, 10).forEach((video, index) => {
                message += `${index + 1}. *${video.title || 'Untitled'}*\n`;
                if (video.duration) message += `   ⏱️ Duration: ${video.duration}\n`;
                if (video.views) message += `   👁️ Views: ${video.views}\n`;
                if (video.url) message += `   🔗 ${video.url}\n`;
                message += `\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Video search error:", error.message);
            
            // If API returns 404, show custom message
            if (error.response?.status === 404) {
                await reply(`⚠️ *Video Search API*\n\nThe video search endpoint is currently unavailable (404).\n\n📌 *Working alternatives:*\n• .tt [username] - TikTok videos\n• .fb [url] - Facebook videos\n• .play [song] - YouTube audio\n\n> Powered by Tracle-Lite`);
            } else {
                await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            }
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
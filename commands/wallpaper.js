const axios = require("axios");

module.exports = {
    pattern: "wallpaper",
    alias: ["wall", "hdwallpaper"],
    category: "image",
    description: "Download HD wallpapers by search",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🖼️ *Wallpaper Downloader*\n\nUsage: .wallpaper [search term] [page number]\nExample: .wallpaper car 1\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🖼️", key: mek.key } });
            
            let searchQuery = q;
            let page = 1;
            const parts = q.split(" ");
            const lastPart = parts[parts.length - 1];
            if (!isNaN(lastPart) && parseInt(lastPart) > 0) {
                page = parseInt(lastPart);
                searchQuery = parts.slice(0, -1).join(" ");
            }
            
            await reply(`🔍 Searching for *${searchQuery}* wallpapers (Page ${page})...`);

            const response = await axios.get(`https://apiskeith.top/download/wallpaper?text=${encodeURIComponent(searchQuery)}&page=${page}`, { timeout: 15000 });

            if (!response.data?.status || !response.data?.result || response.data.result.length === 0) {
                return reply(`❌ No wallpapers found for "${searchQuery}".\n> Powered by Tracle-Lite`);
            }

            const results = response.data.result;
            let message = `🖼️ *WALLPAPER RESULTS* 🖼️\n🔍 *Search:* ${searchQuery}\n📄 *Page:* ${page}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            results.forEach((cat, idx) => {
                message += `📁 *${cat.type || 'Category'}*\n`;
                if (cat.image && cat.image.length > 0) {
                    message += `🖼️ [Click to view](${cat.image[0]})\n`;
                }
                message += `\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━━━━━\n💡 Use .wallpaper ${searchQuery} ${page + 1} for more\n⚡ Powered by Tracle-Lite`;

            // Send first wallpaper image if available
            if (results[0]?.image?.[0]) {
                await conn.sendMessage(from, {
                    image: { url: results[0].image[0] },
                    caption: `🖼️ *${searchQuery} Wallpaper*\n📁 Category: ${results[0].type || 'Wallpaper'}\n> Powered by Tracle-Lite`
                }, { quoted: mek });
            }
            
            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Wallpaper error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
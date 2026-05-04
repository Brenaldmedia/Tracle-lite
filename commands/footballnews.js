const axios = require("axios");

module.exports = {
    pattern: "footballnews",
    alias: ["sportsnews", "footynews"],
    category: "sports",
    description: "Get latest football news",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "📰", key: mek.key } });
            
            const response = await axios.get(`https://apiskeith.top/sports/news`, { timeout: 15000 });
            
            if (!response.data?.status) {
                return reply(`❌ Could not fetch football news.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const news = response.data.result || [];
            let message = `📰 *FOOTBALL NEWS* 📰\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            news.slice(0, 10).forEach((article, i) => {
                message += `${i+1}. *${article.title || article.headline}*\n`;
                if (article.source) message += `   └ Source: ${article.source}\n`;
                if (article.time) message += `   └ 🕒 ${article.time}\n`;
                message += `\n`;
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
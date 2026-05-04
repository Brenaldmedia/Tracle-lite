const axios = require("axios");

module.exports = {
    pattern: "enhance",
    alias: ["enhance", "hdimage", "imagehd"],
    category: "image",
    description: "Enhance image to HD quality",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📸 *Image Enhancer HD*\n\nUsage: .enhance [image URL]\nExample: .enhance https://files.catbox.moe/oug4wu.jpg\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "📸", key: mek.key } });
            await reply(`🔍 Enhancing image to HD quality...`);

            const response = await axios.get(`https://apiskeith.top/ai/hd?url=${encodeURIComponent(q)}`, { timeout: 60000 });

            if (!response.data?.status || !response.data?.result) {
                return reply(`❌ Failed to enhance image.\nThe server might be busy. Try again later.\n> Powered by Tracle-Lite`);
            }

            const resultUrl = response.data.result;
            
            await conn.sendMessage(from, {
                image: { url: resultUrl },
                caption: `✨ *Image Enhanced to HD*\n🔗 ${resultUrl.substring(0, 80)}...\n> Powered by Tracle-Lite`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("ImageHD error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
const axios = require("axios");

module.exports = {
    pattern: "removebg",
    alias: ["rmbg", "bgremove"],
    category: "image",
    description: "Remove background from image",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🖼️ *Remove Background*\n\nUsage: .removebg [image URL]\nExample: .removebg https://files.catbox.moe/18ql9j.jpg\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });
            await reply(`🖌️ Removing background from image...`);

            const response = await axios.get(`https://apiskeith.top/ai/removebg?url=${encodeURIComponent(q)}`, { timeout: 30000 });

            if (!response.data?.status || !response.data?.result) {
                return reply(`❌ Failed to remove background.\nMake sure the image URL is valid.\n> Powered by Tracle-Lite`);
            }

            const resultUrl = response.data.result;
            
            await conn.sendMessage(from, {
                image: { url: resultUrl },
                caption: `✨ *Background Removed*\n🔗 ${resultUrl.substring(0, 80)}...\n> Powered by Tracle-Lite`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("RemoveBG error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
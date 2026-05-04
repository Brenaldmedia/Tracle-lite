const axios = require("axios");

module.exports = {
    pattern: "magicstudio",
    alias: ["magic", "aigen", "genimg"],
    category: "image",
    description: "Generate AI images from magic studio",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🎨 *Magic Studio AI*\n\nUsage: .magicstudio [prompt]\nExample: .magicstudio a beautiful sunset over mountains\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });
            await reply(`✨ Generating AI image for: *${q}*...\n⏳ This may take up to 30 seconds...`);

            const response = await axios.get(`https://apiskeith.top/ai/magicstudio?prompt=${encodeURIComponent(q)}`, { timeout: 60000 });

            if (!response.data?.status || !response.data?.result) {
                return reply(`❌ Failed to generate image.\nTry a different prompt.\n> Powered by Tracle-Lite`);
            }

            const resultUrl = response.data.result;
            
            await conn.sendMessage(from, {
                image: { url: resultUrl },
                caption: `✨ *AI Generated Image*\n📝 Prompt: ${q}\n> Powered by Tracle-Lite`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("MagicStudio error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
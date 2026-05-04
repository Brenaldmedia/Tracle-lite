const axios = require("axios");

module.exports = {
    pattern: "imageedit",
    alias: ["editimage", "imgedit"],
    category: "image",
    description: "Edit image with AI prompt",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🎨 *Image Editor AI*\n\nUsage: .imageedit [prompt] | [image URL]\nExample: .imageedit make him brown | https://files.catbox.moe/oug4wu.jpg\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });
            
            let prompt = q;
            let imageUrl = "";
            
            if (q.includes("|")) {
                const parts = q.split("|");
                prompt = parts[0].trim();
                imageUrl = parts[1].trim();
            }
            
            if (!imageUrl) {
                return reply(`❌ Please provide an image URL after the | separator.\n\nExample: .imageedit make him brown | https://files.catbox.moe/oug4wu.jpg`);
            }
            
            await reply(`🎨 Editing image with prompt: *${prompt}*...`);

            const response = await axios.get(`https://apiskeith.top/ai/imageedit?q=${encodeURIComponent(prompt)}&url=${encodeURIComponent(imageUrl)}`, { timeout: 60000 });

            if (!response.data?.status || !response.data?.result) {
                return reply(`❌ Failed to edit image.\nThe server might be busy. Try again later.\n> Powered by Tracle-Lite`);
            }

            const resultUrl = response.data.result;
            
            await conn.sendMessage(from, {
                image: { url: resultUrl },
                caption: `✨ *Image Edited*\n📝 Prompt: ${prompt}\n> Powered by Tracle-Lite`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("ImageEdit error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
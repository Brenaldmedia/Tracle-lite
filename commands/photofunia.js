const axios = require("axios");

module.exports = {
    pattern: "photofunia",
    alias: ["funia", "photoeffect"],
    category: "image",
    description: "Apply photofunia effects to images",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🎭 *Photofunia Effects*\n\nUsage: .photofunia [text] | [image URL]\nExample: .photofunia Hello World | https://files.catbox.moe/oug4wu.jpg\n\nOr text only:\n.photofunia Hello World\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🎭", key: mek.key } });
            
            let text = q;
            let imageUrl = "";
            
            if (q.includes("|")) {
                const parts = q.split("|");
                text = parts[0].trim();
                imageUrl = parts[1].trim();
            }
            
            await reply(`🎨 Applying photofunia effect...`);

            let apiUrl;
            if (imageUrl) {
                apiUrl = `https://apiskeith.top/ai/photofunia?text=${encodeURIComponent(text)}&url=${encodeURIComponent(imageUrl)}`;
            } else {
                apiUrl = `https://apiskeith.top/ai/photofunia?text=${encodeURIComponent(text)}`;
            }
            
            const response = await axios.get(apiUrl, { timeout: 60000 });

            if (!response.data?.status || !response.data?.result) {
                return reply(`❌ Failed to apply effect.\nTry again later.\n> Powered by Tracle-Lite`);
            }

            const resultUrl = response.data.result;
            
            await conn.sendMessage(from, {
                image: { url: resultUrl },
                caption: `✨ *Photofunia Effect Applied*\n📝 Text: ${text}\n${imageUrl ? '🖼️ With custom image' : ''}\n> Powered by Tracle-Lite`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Photofunia error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
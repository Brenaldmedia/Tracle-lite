const axios = require("axios");

module.exports = {
    pattern: "ephotologo",
    alias: ["ephoto", "logomaker"],
    category: "image",
    description: "Create ephoto logo with up to 3 texts",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🎨 *Ephoto Logo Maker*\n\nUsage:\n.ephotologo text1\n.ephotologo text1 | text2\n.ephotologo text1 | text2 | text3\n\nExample: .ephotologo TRACLE | LITE | BOT\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });
            
            let text1 = "", text2 = "", text3 = "";
            const parts = q.split("|").map(p => p.trim());
            
            text1 = parts[0] || "";
            text2 = parts[1] || "";
            text3 = parts[2] || "";
            
            if (!text1) {
                return reply(`❌ Please provide at least one text.\n\nExample: .ephotologo TRACLE | LITE | BOT`);
            }
            
            await reply(`🎨 Creating logo with: ${text1}${text2 ? `, ${text2}` : ''}${text3 ? `, ${text3}` : ''}...`);

            let apiUrl = `https://apiskeith.top/ai/ephoto?text1=${encodeURIComponent(text1)}`;
            if (text2) apiUrl += `&text2=${encodeURIComponent(text2)}`;
            if (text3) apiUrl += `&text3=${encodeURIComponent(text3)}`;
            
            const response = await axios.get(apiUrl, { timeout: 60000 });

            if (!response.data?.status || !response.data?.result) {
                return reply(`❌ Failed to create logo.\nTry again later.\n> Powered by Tracle-Lite`);
            }

            const resultUrl = response.data.result;
            
            await conn.sendMessage(from, {
                image: { url: resultUrl },
                caption: `✨ *Ephoto Logo Created*\n📝 Text: ${text1}${text2 ? ` | ${text2}` : ''}${text3 ? ` | ${text3}` : ''}\n> Powered by Tracle-Lite`
            }, { quoted: mek });
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("EphotoLogo error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
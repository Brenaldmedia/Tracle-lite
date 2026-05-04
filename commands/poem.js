const axios = require("axios");

module.exports = {
    pattern: "poem",
    alias: ["randompoem", "poetry"],
    category: "education",
    description: "Get random poem",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "📖", key: mek.key } });
            await reply(`📖 Fetching a random poem...`);

            const response = await axios.get(`https://apiskeith.top/education/poem`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Could not fetch poem.\n> Powered by Tracle-Lite`);
            }

            const poem = response.data.result;
            
            let message = `📖 *RANDOM POEM* 📖\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            if (poem.title) message += `📛 *Title:* ${poem.title}\n`;
            if (poem.author) message += `✍️ *Author:* ${poem.author}\n`;
            message += `\n${poem.content || poem.poem || poem.text}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Poem error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
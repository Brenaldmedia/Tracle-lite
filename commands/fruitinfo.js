const axios = require("axios");

module.exports = {
    pattern: "fruitinfo",
    alias: ["fruit", "fruitanalysis"],
    category: "education",
    description: "Get full fruit science analysis",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🍎 *Fruit Science Info*\n\nUsage: .fruitinfo [fruit name]\nExample: .fruitinfo apple\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🍎", key: mek.key } });
            await reply(`🔬 Analyzing fruit: *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/education/fruit?name=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Fruit "${q}" not found.\n> Powered by Tracle-Lite`);
            }

            const data = response.data.result;
            
            let message = `🍎 *FRUIT SCIENCE ANALYSIS* 🍎\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `📛 *Name:* ${data.name || q}\n`;
            if (data.scientific_name) message += `🔬 *Scientific:* ${data.scientific_name}\n`;
            if (data.family) message += `🏠 *Family:* ${data.family}\n`;
            if (data.nutrition) message += `\n📊 *Nutrition Facts:*\n${data.nutrition}\n`;
            if (data.benefits) message += `\n💪 *Health Benefits:*\n${data.benefits}\n`;
            if (data.calories) message += `\n🔥 *Calories:* ${data.calories} per 100g\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("FruitInfo error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
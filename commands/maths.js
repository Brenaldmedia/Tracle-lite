const axios = require("axios");

module.exports = {
    pattern: "maths",
    alias: ["math", "mathai", "mathsolver"],
    category: "education",
    description: "Maths AI assistant - solve math problems",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📐 *Maths AI*\n\nUsage: .maths [your question]\nExample: .maths Solve 2x + 5 = 15\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "📐", key: mek.key } });
            await reply(`📊 Solving math problem...`);

            const response = await axios.get(`https://apiskeith.top/education/maths?question=${encodeURIComponent(q)}`, { timeout: 30000 });

            if (!response.data?.status) {
                return reply(`❌ Could not solve the problem.\n> Powered by Tracle-Lite`);
            }

            const answer = response.data.result;
            
            let message = `📐 *MATHS AI* 📐\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `❓ *Problem:*\n${q}\n\n`;
            message += `✅ *Solution:*\n${typeof answer === 'string' ? answer : answer.solution || answer.answer || JSON.stringify(answer)}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Maths error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
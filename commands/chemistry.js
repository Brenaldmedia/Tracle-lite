const axios = require("axios");

module.exports = {
    pattern: "chemistry",
    alias: ["chem", "chemai", "chemistrysolver"],
    category: "education",
    description: "Chemistry AI - solve chemistry quizzes",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🧪 *Chemistry AI*\n\nUsage: .chemistry [your question]\nExample: .chemistry What is the atomic number of Oxygen?\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🧪", key: mek.key } });
            await reply(`🧪 Solving chemistry problem...`);

            const response = await axios.get(`https://apiskeith.top/education/chemistry?question=${encodeURIComponent(q)}`, { timeout: 30000 });

            if (!response.data?.status) {
                return reply(`❌ Could not solve the problem.\n> Powered by Tracle-Lite`);
            }

            const answer = response.data.result;
            
            let message = `🧪 *CHEMISTRY AI* 🧪\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `❓ *Question:*\n${q}\n\n`;
            message += `✅ *Answer:*\n${typeof answer === 'string' ? answer : answer.answer || answer.explanation || JSON.stringify(answer)}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Chemistry error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
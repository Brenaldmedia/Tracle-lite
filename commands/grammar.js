const axios = require("axios");

module.exports = {
    pattern: "grammar",
    alias: ["grammarcheck", "spellcheck"],
    category: "education",
    description: "Check grammar and spelling",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📝 *Grammar Check*\n\nUsage: .grammar [text to check]\nExample: .grammar I goed to school yesterday\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "📝", key: mek.key } });
            await reply(`🔍 Checking grammar for: "${q.substring(0, 50)}..."`);

            const response = await axios.get(`https://apiskeith.top/education/grammar?text=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Could not check grammar.\n> Powered by Tracle-Lite`);
            }

            const result = response.data.result;
            
            let message = `📝 *GRAMMAR CHECK* 📝\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `📄 *Original:*\n${q}\n\n`;
            if (result.corrected) message += `✅ *Corrected:*\n${result.corrected}\n\n`;
            if (result.errors) message += `⚠️ *Errors Found:*\n${result.errors}\n`;
            if (result.suggestions) message += `\n💡 *Suggestions:*\n${result.suggestions}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Grammar error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
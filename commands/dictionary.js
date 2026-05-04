const axios = require("axios");

module.exports = {
    pattern: "dictionary",
    alias: ["dict", "define", "meaning"],
    category: "education",
    description: "Get full word definition and analysis",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📚 *Dictionary*\n\nUsage: .dictionary [word]\nExample: .dictionary serendipity\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "📚", key: mek.key } });
            await reply(`🔍 Looking up word: *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/education/dictionary?word=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Word "${q}" not found.\n> Powered by Tracle-Lite`);
            }

            const data = response.data.result;
            
            let message = `📚 *DICTIONARY* 📚\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `📛 *Word:* ${data.word || q}\n`;
            if (data.phonetic) message += `🔊 *Phonetic:* ${data.phonetic}\n`;
            if (data.pronunciation) message += `🎤 *Pronunciation:* ${data.pronunciation}\n`;
            
            if (data.meanings && data.meanings.length > 0) {
                message += `\n📖 *Definitions:*\n`;
                data.meanings.forEach((meaning, idx) => {
                    message += `\n${idx + 1}. *${meaning.partOfSpeech || 'General'}*\n`;
                    if (meaning.definition) message += `   📝 ${meaning.definition}\n`;
                    if (meaning.example) message += `   💡 Example: "${meaning.example}"\n`;
                    if (meaning.synonyms && meaning.synonyms.length) message += `   🔄 Synonyms: ${meaning.synonyms.join(', ')}\n`;
                });
            }
            
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Dictionary error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
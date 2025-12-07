// === define.js ===
const axios = require('axios');

module.exports = {
    pattern: "define",
    desc: "Get the definition of a word",
    category: "search", 
    react: "🔍",
    filename: __filename,
    use: ".define hello",

    execute: async (conn, mek, m, { from, reply, q }) => {
        try {
            if (!q) return reply("Please provide a word to define.\n\n📌 *Usage:* .define [word]");

            const word = q.trim();
            const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;

            const response = await axios.get(url);
            const definitionData = response.data[0];

            const definition = definitionData.meanings[0].definitions[0].definition;
            const example = definitionData.meanings[0].definitions[0].example || '❌ No example available';
            const synonyms = definitionData.meanings[0].definitions[0].synonyms.join(', ') || '❌ No synonyms available';
            const phonetics = definitionData.phonetics[0]?.text || '🔇 No phonetics available';
            const audio = definitionData.phonetics[0]?.audio || null;

            const wordInfo = `
📖 *Word*: *${definitionData.word}*  
🗣️ *Pronunciation*: _${phonetics}_  
📚 *Definition*: ${definition}  
✍️ *Example*: ${example}  
📝 *Synonyms*: ${synonyms}  

> *© Powered By TRACLE-LITE*`;

            // Send reaction
            await conn.sendMessage(from, {
                react: {
                    text: "🔍",
                    key: mek.key
                }
            });

            if (audio) {
                await conn.sendMessage(from, { 
                    audio: { url: audio }, 
                    mimetype: 'audio/mpeg'
                }, { quoted: mek });
            }

            await conn.sendMessage(from, { text: wordInfo }, { quoted: mek });

        } catch (e) {
            console.error("Define Error:", e);
            if (e.response && e.response.status === 404) {
                return reply("🚫 *Word not found.* Please check the spelling and try again.");
            }
            return reply("⚠️ An error occurred while fetching the definition. Please try again later.");
        }
    }
};
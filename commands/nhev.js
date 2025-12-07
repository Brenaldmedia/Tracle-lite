// === nhev.js (simplified for WhatsApp) ===
const axios = require("axios");

module.exports = {
    pattern: "nhev",
    alias: ["neverhaveiever", "never", "nhie"],
    desc: "Get a random 'Never Have I Ever' question",
    category: "fun",
    react: "🎮",
    filename: __filename,
    use: ".nhev",

    execute: async (conn, mek, m, { from, reply, sessionId }) => {
        try {
            // React 🎮
            if (module.exports.react) {
                await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
            }

            // Using Keith Never Have I Ever API
            const apiUrl = `https://apis-keith.vercel.app/fun/never-have-i-ever`;
            
            console.log(`🎮 Never Have I Ever API request`);

            const { data } = await axios.get(apiUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Validate API response
            if (!data || data.status !== true || !data.result) {
                return await reply("❌ Failed to get question. Try again!");
            }

            const question = data.result;

            // Simple WhatsApp-friendly format
            const message = 
`🎮 *Never Have I Ever* 🎮

${question}

💡 *React with:*
👍 = I HAVE done this!
👎 = I HAVEN'T done this!

Type .nhev for another question!`;

            // Send the question
            await reply(message);

        } catch (error) {
            console.error("[nhev.js] Error:", error.message);
            await reply("❌ Failed to get question. Try .nhev again!");
        }
    }
};
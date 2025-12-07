const { fetchJson } = require("../lib/functions");
const { translate } = require("@vitalets/google-translate-api");

module.exports = {
    pattern: "wikipedia",
    desc: "Fetch Wikipedia information and translate to English",
    category: "information",
    filename: __filename,
    use: ".wikipedia <query>",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply("❌ Please provide a search query for Wikipedia.\nExample: .wikipedia Nigeria");
            }

            // Send reaction
            await conn.sendMessabge(from, { 
                react: { text: "📖", key: mek.key } 
            });

            await reply("🔍 Searching Wikipedia...");

            const response = await fetchJson(`https://api.siputzx.my.id/api/s/wikipedia?query=${encodeURIComponent(q)}`);

            if (!response.status || !response.data) {
                return reply("❌ No results found for your query.");
            }

            const { wiki, thumb } = response.data;

            // Translate the Wikipedia text to English
            const translated = await translate(wiki, { to: "en" });

            let message = `📖 *Wikipedia Result*\n\n📝 *Query:* ${q}\n\n${translated.text}\n\n━━━━━━━━━━━━━━━━━━━━━━\n> 🔍 Powered by BrenaldMedia`;

            if (thumb) {
                await conn.sendMessage(from, {
                    image: { url: thumb },
                    caption: message
                }, { quoted: mek });
            } else {
                await reply(message);
            }

        } catch (error) {
            console.error("❌ Wikipedia command error:", error);
            await conn.sendMessage(from, { 
                react: { text: "❌", key: mek.key } 
            });
            reply("❌ An error occurred: " + error.message);
        }
    }
};

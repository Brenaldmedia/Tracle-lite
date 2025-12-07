// === deadpool.js ===
const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "deadpool",
    desc: "Create a Deadpool style text effect",
    category: "logo",
    react: "⚔️",
    filename: __filename,
    use: ".deadpool Empire",

    execute: async (conn, mek, m, { from, reply, q }) => {
        try {
            if (!q) {
                return reply("❌ Please provide a name. Example: .deadpool Empire");
            }
            
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-text-effects-in-the-style-of-the-deadpool-logo-818.html&name=${encodeURIComponent(q)}`;

            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate Deadpool effect.");
            }

            await conn.sendMessage(from, {
                react: { text: "⚔️", key: mek.key }
            });

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "⚔️ *Deadpool Text Effect*\n> *© Powered By TRACLE-LITE*"
            }, { quoted: mek });

        } catch (e) {
            console.error("Deadpool Error:", e);
            reply(`❌ An error occurred: ${e.message}`);
        }
    }
};
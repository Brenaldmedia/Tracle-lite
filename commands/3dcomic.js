// === 3dcomic.js ===
const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "3dcomic",
    desc: "Create a 3D Comic-style text effect",
    category: "logo",
    react: "🎨",
    filename: __filename,
    use: ".3dcomic Empire",

    execute: async (conn, mek, m, { from, reply, q }) => {
        try {
            if (!q) {
                return reply("❌ Please provide a name. Example: .3dcomic Empire");
            }
            
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-online-3d-comic-style-text-effects-817.html&name=${encodeURIComponent(q)}`;

            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate 3D comic effect.");
            }

            await conn.sendMessage(from, {
                react: { text: "🎨", key: mek.key }
            });

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🎨 *3D Comic Text Effect*\n> *© Powered By TRACLE-LITE*"
            }, { quoted: mek });

        } catch (e) {
            console.error("3D Comic Error:", e);
            reply(`❌ An error occurred: ${e.message}`);
        }
    }
};
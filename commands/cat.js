const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "cat",
    desc: "Create a cat text effect",
    category: "logo",
    filename: __filename,
    use: ".cat text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .cat Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/handwritten-text-on-foggy-glass-online-680.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate cat effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🐱 Your Cat Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
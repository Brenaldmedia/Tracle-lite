const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "naruto",
    desc: "Create a Naruto text effect",
    category: "logo",
    filename: __filename,
    use: ".naruto text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .naruto Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/naruto-shippuden-logo-style-text-effect-online-808.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate Naruto effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🌀 Your Naruto Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
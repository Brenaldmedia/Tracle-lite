const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "boom",
    desc: "Create a Boom text effect",
    category: "logo",
    filename: __filename,
    use: ".boom text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .boom Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/boom-text-comic-style-text-effect-675.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate boom effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "💥 Your Boom Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
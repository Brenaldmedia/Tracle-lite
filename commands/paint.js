const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "paint",
    desc: "Create a Paint text effect",
    category: "logo",
    filename: __filename,
    use: ".paint text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .paint Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-3d-colorful-paint-text-effect-online-801.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate paint effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🎨 Your Paint Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
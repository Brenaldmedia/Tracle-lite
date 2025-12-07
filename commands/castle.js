const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "castle",
    desc: "Create a Castle text effect",
    category: "logo",
    filename: __filename,
    use: ".castle text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .castle Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-a-3d-castle-pop-out-mobile-photo-effect-786.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate castle effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🏰 Your Castle Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
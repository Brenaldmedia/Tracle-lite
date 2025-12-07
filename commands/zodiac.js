const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "zodiac",
    desc: "Create a Zodiac text effect",
    category: "logo",
    filename: __filename,
    use: ".zodiac text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .zodiac Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-star-zodiac-wallpaper-mobile-604.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate zodiac effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "♈ Your Zodiac Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
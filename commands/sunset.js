const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "sunset",
    desc: "Create a sunset text effect",
    category: "logo",
    filename: __filename,
    use: ".sunset text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .sunset Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-sunset-light-text-effects-online-807.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate sunset effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🌅 Your Sunset Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
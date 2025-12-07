const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "tatoo",
    desc: "Create a Tattoo text effect",
    category: "logo",
    filename: __filename,
    use: ".tatoo text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .tatoo Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/make-tattoos-online-by-empire-tech-309.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate tattoo effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🖋️ Your Tattoo Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
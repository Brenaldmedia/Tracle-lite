const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "angelwings",
    desc: "Create an Angel Wings text effect",
    category: "logo",
    filename: __filename,
    use: ".angelwings text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .angelwings Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/angel-wing-effect-329.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate angel wings effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "👼 Your Angel Wings Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
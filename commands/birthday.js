const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "birthday",
    desc: "Create a Birthday text effect",
    category: "logo",
    filename: __filename,
    use: ".birthday text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .birthday Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/beautiful-3d-foil-balloon-effects-for-holidays-and-birthday-803.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate birthday effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🎂 Your Birthday Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
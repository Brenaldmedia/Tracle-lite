const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "eraser",
    desc: "Create an Eraser text effect",
    category: "logo",
    filename: __filename,
    use: ".eraser text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .eraser Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-eraser-deleting-text-effect-online-717.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate eraser effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🧽 Your Eraser Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
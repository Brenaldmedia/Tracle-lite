const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "leaf",
    desc: "Create a Leaf text effect",
    category: "logo",
    filename: __filename,
    use: ".leaf text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .leaf Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/green-brush-text-effect-typography-maker-online-153.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate leaf effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🍃 Your Leaf Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
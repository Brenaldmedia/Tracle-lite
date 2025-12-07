const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "nigeria",
    desc: "Create a Nigeria text effect",
    category: "logo",
    filename: __filename,
    use: ".nigeria text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .nigeria Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/nigeria-3d-flag-text-effect-online-free-753.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate Nigeria flag effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🇳🇬 Your Nigeria Flag Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
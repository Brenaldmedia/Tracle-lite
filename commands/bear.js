const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "bear",
    desc: "Create a Bear text effect",
    category: "logo",
    filename: __filename,
    use: ".bear text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .bear Empire");
        }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/free-bear-logo-maker-online-673.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate bear effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🐻 Your Bear Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
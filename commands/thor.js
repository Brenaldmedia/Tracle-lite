const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "thor",
    desc: "Create a Thor text effect",
    category: "logo",
    filename: __filename,
    use: ".thor text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .thor Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-thor-logo-style-text-effects-online-for-free-796.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate Thor effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "⚡ Your Thor Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
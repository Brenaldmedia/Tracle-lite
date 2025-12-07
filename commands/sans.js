const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "sans",
    desc: "Create a Sand text effect",
    category: "logo",
    filename: __filename,
    use: ".sans text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .sans Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/write-in-sand-summer-beach-online-free-595.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate sand effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🏖️ Your Sand Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
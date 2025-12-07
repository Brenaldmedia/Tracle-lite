const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "typography",
    desc: "Create a Typography text effect",
    category: "logo",
    filename: __filename,
    use: ".typography text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .typography Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-typography-status-online-with-impressive-leaves-357.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate typography effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🔤 Your Typography Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
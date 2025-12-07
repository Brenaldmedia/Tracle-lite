const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "clouds",
    desc: "Create a Clouds text effect",
    category: "logo",
    filename: __filename,
    use: ".clouds text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .clouds Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/write-text-effect-clouds-in-the-sky-online-619.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate clouds effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "☁️ Your Clouds Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
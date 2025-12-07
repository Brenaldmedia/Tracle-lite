const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "futuristic",
    desc: "Create a futuristic text effect",
    category: "logo",
    filename: __filename,
    use: ".futuristic text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .futuristic Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/light-text-effect-futuristic-technology-style-648.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate futuristic effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🔮 Your Futuristic Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
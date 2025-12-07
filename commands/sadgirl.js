const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "sadgirl",
    desc: "Create a sadgirl text effect",
    category: "logo",
    filename: __filename,
    use: ".sadgirl text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .sadgirl Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/write-text-on-wet-glass-online-589.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate sadgirl effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "😢 Your Sad Girl Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
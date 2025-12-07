const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "bulb",
    desc: "Create a Bulb text effect",
    category: "logo",
    filename: __filename,
    use: ".bulb text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .bulb Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/text-effects-incandescent-bulbs-219.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate bulb effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "💡 Your Bulb Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
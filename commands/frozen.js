const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "frozen",
    desc: "Create a Frozen text effect",
    category: "logo",
    filename: __filename,
    use: ".frozen text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .frozen Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-a-frozen-christmas-text-effect-online-792.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate frozen effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "❄️ Your Frozen Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
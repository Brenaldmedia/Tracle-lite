const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "neonlight",
    desc: "Create a neon light text effect",
    category: "logo",
    filename: __filename,
    use: ".neonlight text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .neonlight Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate neon light effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "💡 Your Neon Light Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "devilwings",
    desc: "Create a Devil Wings text effect",
    category: "logo",
    filename: __filename,
    use: ".devilwings text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .devilwings Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate devil wings effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "😈 Your Devil Wings Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
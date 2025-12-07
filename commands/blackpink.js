const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "blackpink",
    desc: "Create a Blackpink text effect",
    category: "logo",
    filename: __filename,
    use: ".blackpink text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .blackpink Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-a-blackpink-style-logo-with-members-signatures-810.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate Blackpink effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "🖤💖 Your Blackpink Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
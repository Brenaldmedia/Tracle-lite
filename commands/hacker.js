const { fetchJson } = require('../lib/functions2');

module.exports = {
    pattern: "hacker",
    desc: "Create a Hacker text effect",
    category: "logo",
    filename: __filename,
    use: ".hacker text",

    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ Please provide a name. Example: .hacker Empire");
            }
            
            const name = args.join(" ");
            const apiUrl = `https://api-pink-venom.vercel.app/api/logo?url=https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html&name=${encodeURIComponent(name)}`;
            const result = await fetchJson(apiUrl);

            if (!result?.result?.download_url) {
                return reply("❌ Failed to generate hacker effect.");
            }

            await conn.sendMessage(from, {
                image: { url: result.result.download_url },
                caption: "💻 Your Hacker Text Effect"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
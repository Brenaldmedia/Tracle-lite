const axios = require("axios");

module.exports = {
    pattern: "ringtone",
    desc: "Get a random ringtone from the API",
    category: "fun",
    filename: __filename,
    use: ".ringtone <query>",

    execute: async (conn, mek, m, { from, args, q, reply }) => {
        try {
            const query = q || args.join(" ");
            if (!query) {
                return reply("❌ Please provide a search query! Example: .ringtone alabi");
            }

            // Send reaction
            await conn.sendMessage(from, { 
                react: { text: "🎵", key: mek.key } 
            });

            const { data } = await axios.get(`https://www.dark-yasiya-api.site/download/ringtone?text=${encodeURIComponent(query)}`);

            if (!data.status || !data.result || data.result.length === 0) {
                return reply("❌ No ringtones found for your query. Please try a different keyword.");
            }

            const randomRingtone = data.result[Math.floor(Math.random() * data.result.length)];

            await conn.sendMessage(
                from,
                {
                    audio: { url: randomRingtone.dl_link },
                    mimetype: "audio/mpeg",
                    fileName: `${randomRingtone.title}.mp3`,
                    caption: `🎵 *${randomRingtone.title}*\n\n> Powered by BrenaldMedia`
                },
                { quoted: mek }
            );

        } catch (error) {
            console.error("❌ Error in ringtone command:", error);
            await conn.sendMessage(from, { 
                react: { text: "❌", key: mek.key } 
            });
            reply("❌ Sorry, something went wrong while fetching the ringtone. Please try again later.");
        }
    }
};
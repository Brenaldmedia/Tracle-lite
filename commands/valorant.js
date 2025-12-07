const { getBuffer } = require('../lib/functions2');

module.exports = {
    pattern: "valorant",
    desc: "Create a Valorant YouTube banner with three text inputs",
    category: "logo",
    filename: __filename,
    use: ".valorant text1 text2 text3",

    execute: async (conn, mek, m, { from, prefix, args, reply }) => {
        try {
            if (args.length < 3) {
                return reply(`❌ Please provide 3 text inputs. Example:\n${prefix}valorant Text1 Text2 Text3`);
            }

            const text1 = args[0];
            const text2 = args[1];
            const text3 = args.slice(2).join(" ");
            const apiUrl = `https://api.nexoracle.com/ephoto360/valorant-youtube-banner?apikey=MepwBcqIM0jYN0okD&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}&text3=${encodeURIComponent(text3)}`;
            const buffer = await getBuffer(apiUrl);

            await conn.sendMessage(from, {
                image: buffer,
                caption: "🎮 Your Valorant YouTube Banner!"
            }, { quoted: mek });

        } catch (e) {
            return reply(`❌ Error: ${e.message}`);
        }
    }
};
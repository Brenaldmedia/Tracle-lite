const axios = require("axios");

module.exports = {
    pattern: "hentai",
    alias: ["hvid", "hentaivid"],
    category: "adult",
    description: "Random hentai video or search",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "🔞", key: mek.key } });

            let searchTerm = q;

            // If no search term, pick random popular hentai
            if (!searchTerm) {
                const randomTerms = ["2b", "ahegao", "akali", "yorha", "cammy", "panam", "kyrie", "nezuko", "zero two"];
                searchTerm = randomTerms[Math.floor(Math.random() * randomTerms.length)];
                await reply("🎲 Picking random hentai...");
            } else {
                await reply(`🔍 Searching: *${searchTerm}*`);
            }

            const apiUrl = `https://apiskeith.top/dl/hentaivid?q=${encodeURIComponent(searchTerm)}`;
            const response = await axios.get(apiUrl, { timeout: 30000 });

            if (!response.data?.status || !response.data?.result?.length) {
                return reply("❌ No hentai found. Try again.");
            }

            const first = response.data.result[0];
            let videoUrl = null;
            let title = first.title || "Hentai Video";

            if (first.media?.video_url) videoUrl = first.media.video_url;
            else if (first.media?.fallback_url) videoUrl = first.media.fallback_url;
            else if (first.video_url) videoUrl = first.video_url;

            if (!videoUrl) {
                return reply("❌ Could not get video link.");
            }

            await reply(`📥 Downloading: *${title}*`);

            const videoRes = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 90000
            });

            const videoBuffer = Buffer.from(videoRes.data);
            const sizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);

            const fileName = `${title.replace(/[^\w\s]/gi, '')}.mp4`;

            await conn.sendMessage(from, {
                document: videoBuffer,
                mimetype: "video/mp4",
                fileName: fileName,
                caption: `🔞 *Hentai*\n📛 ${title}\n📦 Size: ${sizeMB} MB`
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Hentai error:", error.message);
            await reply("❌ Failed to load hentai. Try again.");
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
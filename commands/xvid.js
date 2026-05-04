const axios = require("axios");

module.exports = {
    pattern: "xvid",
    alias: ["dlxvideo", "xvideo", "getvideo"],
    category: "adult",
    description: "Download multiple videos from xvideos as document",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🎬 *XVideo Downloader*\n\nUsage: .xvid [search term]`);
            }

            await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });
            await reply("⏳ Downloading top 5 videos...");

            const searchUrl = `https://apiskeith.top/search/xvideos?q=${encodeURIComponent(q)}`;
            const searchRes = await axios.get(searchUrl, { timeout: 25000 });

            if (!searchRes.data?.status || !searchRes.data?.result?.length) {
                return reply("❌ No results found.");
            }

            const results = searchRes.data.result.slice(0, 5); // Top 5 only

            let sentCount = 0;

            for (const item of results) {
                try {
                    const pageUrl = item.url;
                    const downloadApi = `https://apiskeith.top/download/xvideos?url=${encodeURIComponent(pageUrl)}`;
                    const downloadRes = await axios.get(downloadApi, { timeout: 30000 });

                    let videoUrl = null;
                    if (downloadRes.data?.result) {
                        const r = downloadRes.data.result;
                        videoUrl = r.download_url || r.downloadUrl || r.url || r.video;
                    }

                    if (!videoUrl) continue;

                    const videoRes = await axios.get(videoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000
                    });

                    const videoBuffer = Buffer.from(videoRes.data);
                    const sizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);

                    const fileName = `${item.title.replace(/[^\w\s]/gi, '')}.mp4`;

                    await conn.sendMessage(from, {
                        document: videoBuffer,
                        mimetype: "video/mp4",
                        fileName: fileName,
                        caption: `🎬 ${item.title}\n📦 Size: ${sizeMB} MB`
                    }, { quoted: mek });

                    sentCount++;
                    await delay(1500); // Small delay to avoid flooding

                } catch (e) {
                    console.log(`Failed one video: ${e.message}`);
                }
            }

            if (sentCount > 0) {
                await reply(`✅ Successfully sent ${sentCount} video(s) as documents.`);
            } else {
                await reply("❌ Could not download any videos.");
            }

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("xvid error:", error.message);
            await reply("❌ Failed to process request.");
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
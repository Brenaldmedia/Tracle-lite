const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    pattern: "fb",
    alias: ["facebook", "fbdl", "fbvideo"],
    category: "downloader",
    description: "Download Facebook videos",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📱 *Facebook Video Downloader*\n\nUsage: .fb [facebook video url]\nExample: .fb https://www.facebook.com/share/r/19zyz6X8KJ/\n\n> ⚡ Powered by TRACLE LOTE`);
            }

            await conn.sendMessage(from, { react: { text: "📱", key: mek.key } });

            // Validate Facebook URL
            if (!q.includes("facebook.com") && !q.includes("fb.com")) {
                return reply(`❌ Please provide a valid Facebook video URL.\n\nExample: .fb https://www.facebook.com/share/r/19zyz6X8KJ/`);
            }

            console.log(`\n🔍 Downloading Facebook video: ${q}`);
            await reply(`⏳ Fetching video from Facebook...`);

            // Call Keith API
            const apiUrl = `https://apiskeith.top/download/fbdl?url=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });

            console.log(`📦 API Response:`, JSON.stringify(response.data, null, 2));

            if (!response.data?.status || !response.data?.result) {
                return reply(`❌ Failed to get video.\nError: ${response.data?.error || 'Unknown error'}\n\nMake sure the video is public.`);
            }

            const videoUrl = response.data.result;
            console.log(`✅ Got video URL: ${videoUrl.substring(0, 100)}...`);

            await reply(`📥 Downloading video...`);

            // Download the video
            const videoResponse = await axios({
                method: 'get',
                url: videoUrl,
                responseType: 'stream',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.facebook.com/'
                }
            });

            const tempFile = path.join(__dirname, `fb_${Date.now()}.mp4`);
            const writer = fs.createWriteStream(tempFile);
            
            let downloadedBytes = 0;
            videoResponse.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                process.stdout.write(`\r📥 Downloading: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
            });

            await new Promise((resolve, reject) => {
                videoResponse.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`\n✅ Download complete! Size: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);

            // Check file size (WhatsApp limit ~16MB for videos)
            const stats = fs.statSync(tempFile);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            if (fileSizeMB > 16) {
                fs.unlinkSync(tempFile);
                return reply(`❌ Video too large (${fileSizeMB.toFixed(2)} MB). WhatsApp limit is 16MB.`);
            }

            // Send the video
            console.log(`📤 Sending to WhatsApp...`);
            await conn.sendMessage(from, {
                video: { url: tempFile },
                mimetype: "video/mp4",
                caption: `📱 *Facebook Video*\n\nDownloaded via Keith API`,
                fileName: `facebook_video_${Date.now()}.mp4`
            }, { quoted: mek });

            // Cleanup
            fs.unlinkSync(tempFile);
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            console.log(`✅ Video sent successfully!\n`);

        } catch (error) {
            console.error("\n❌ Error details:", error.message);
            if (error.response) console.error("Response status:", error.response.status);
            
            await reply(`❌ Failed to download.\nError: ${error.message.substring(0, 100)}\n\nMake sure:\n• URL is correct\n• Video is public\n• Facebook isn't blocking the request`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
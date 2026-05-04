const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    pattern: "tt",
    alias: ["tiktok", "tiktokdl", "ttstalk"],
    category: "downloader",
    description: "Search and download TikTok videos by username",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🎵 *TikTok Downloader*\n\nUsage: .tt [username]\nExample: .tt brenaldmedia\n\nOther options:\n• .tt [username] 1 - Get specific video by number\n• .tt [username] video - Get watermark-free video\n\n> ⚡ Powered by TRACLE-LITE`);
            }

            await conn.sendMessage(from, { react: { text: "🎵", key: mek.key } });

            // Parse query
            let searchQuery = q;
            let videoIndex = 0; // 0 = first video
            let noWatermark = false;
            
            const parts = q.split(" ");
            if (!isNaN(parts[parts.length - 1]) && parseInt(parts[parts.length - 1]) > 0) {
                videoIndex = parseInt(parts.pop()) - 1;
                searchQuery = parts.join(" ");
            }
            
            if (searchQuery.toLowerCase().endsWith(" video")) {
                noWatermark = true;
                searchQuery = searchQuery.slice(0, -6).trim();
            }
            
            console.log(`\n🔍 Searching TikTok for: "${searchQuery}"`);
            await reply(`🔍 Fetching videos from @${searchQuery}...`);

            // Call Keith API
            const apiUrl = `https://apiskeith.top/search/tiktoksearch?query=${encodeURIComponent(searchQuery)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });

            console.log(`📦 API Response status: ${response.data?.status}`);

            if (!response.data?.status || !response.data?.result || response.data.result.length === 0) {
                return reply(`❌ No videos found for "${searchQuery}"\n\nMake sure the username exists.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const videos = response.data.result;
            console.log(`✅ Found ${videos.length} videos`);

            // Check if index is valid
            if (videoIndex >= videos.length) {
                return reply(`❌ Only ${videos.length} videos available. Try index 1-${videos.length}\n> ⚡ Powered by TRACLE-LITE`);
            }

            const selectedVideo = videos[videoIndex];
            const videoUrl = noWatermark ? selectedVideo.wmplay : selectedVideo.play;
            const coverUrl = selectedVideo.cover;
            const title = selectedVideo.title || `${searchQuery}'s video`;
            const duration = selectedVideo.duration;
            const region = selectedVideo.region;
            const author = selectedVideo.author?.nickname || searchQuery;
            const size = selectedVideo.size;
            
            // Format file size
            const fileSizeMB = (size / (1024 * 1024)).toFixed(2);
            
            console.log(`📹 Selected video ${videoIndex + 1}:`);
            console.log(`   Author: ${author}`);
            console.log(`   Region: ${region}`);
            console.log(`   Duration: ${duration} seconds`);
            console.log(`   Size: ${fileSizeMB} MB`);
            console.log(`   Watermark: ${noWatermark ? 'No' : 'Yes'}`);
            
            if (fileSizeMB > 15) {
                return reply(`⚠️ Video too large (${fileSizeMB} MB). WhatsApp limit is ~16MB. Try another video.\n> ⚡ Powered by TRACLE-LITE`);
            }
            
            await reply(`⏳ Downloading video ${videoIndex + 1}/${videos.length}...\n📊 ${fileSizeMB} MB | ⏱️ ${duration}s`);

            // Download the video
            const videoResponse = await axios({
                method: 'get',
                url: videoUrl,
                responseType: 'stream',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.tiktok.com/'
                }
            });

            const tempFile = path.join(__dirname, `tt_${Date.now()}.mp4`);
            const writer = fs.createWriteStream(tempFile);
            
            let downloadedBytes = 0;
            videoResponse.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                process.stdout.write(`\r📥 Downloading: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB / ${fileSizeMB} MB`);
            });

            await new Promise((resolve, reject) => {
                videoResponse.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`\n✅ Download complete!`);

            // Prepare caption
            const caption = `🎵 *TikTok Video*\n\n👤 *User:* @${author}\n📍 *Region:* ${region}\n⏱️ *Duration:* ${duration} seconds\n📊 *Size:* ${fileSizeMB} MB\n🎬 *Video ${videoIndex + 1}/${videos.length}*\n${title ? `\n📝 *Caption:* ${title.substring(0, 100)}${title.length > 100 ? '...' : ''}` : ''}\n\n> ⚡ Powered by TRACLE-LITE`;

            // Send the video
            console.log(`📤 Sending to WhatsApp...`);
            await conn.sendMessage(from, {
                video: { url: tempFile },
                mimetype: "video/mp4",
                caption: caption,
                thumbnail: { url: coverUrl }
            }, { quoted: mek });

            // Cleanup
            fs.unlinkSync(tempFile);
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            console.log(`✅ Video sent successfully!\n`);

        } catch (error) {
            console.error("\n❌ Error details:", error.message);
            if (error.response) console.error("Response status:", error.response.status);
            
            await reply(`❌ Failed to download TikTok video.\nError: ${error.message.substring(0, 100)}\n\nTry again later or use a different username.\n> ⚡ Powered by TRACLE-LITE`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
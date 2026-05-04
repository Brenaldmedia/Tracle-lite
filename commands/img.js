const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    pattern: "img",
    alias: ["image", "pic", "photo", "gambar"],
    category: "search",
    description: "Search and download images from the web",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🖼️ *Image Search*\n\nUsage: .img [search query]\nExample: .img cute dog\n\nOptions:\n• .img cat - First image\n• .img dog 5 - Get 5th image\n• .img flower - Random image\n\n> ⚡ Powered by TRACLE-LITE`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

            // Parse query and index
            let searchQuery = q;
            let imageIndex = 0; // 0 = first image
            
            // Check if user specified an index (e.g., "dog 5")
            const parts = q.split(" ");
            const lastPart = parts[parts.length - 1];
            if (!isNaN(lastPart) && parseInt(lastPart) > 0) {
                imageIndex = parseInt(lastPart) - 1;
                searchQuery = parts.slice(0, -1).join(" ");
            }
            
            console.log(`\n🔍 Searching images for: "${searchQuery}" (index: ${imageIndex + 1})`);
            await reply(`🔍 Searching for *${searchQuery}* images...`);

            // Call Keith API
            const apiUrl = `https://apiskeith.top/search/images?query=${encodeURIComponent(searchQuery)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });

            console.log(`📦 API Response status: ${response.data?.status}`);

            if (!response.data?.status || !response.data?.result || response.data.result.length === 0) {
                return reply(`❌ No images found for "${searchQuery}"\n\nTry a different search term.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const images = response.data.result;
            console.log(`✅ Found ${images.length} images`);

            // Check if index is valid
            if (imageIndex >= images.length) {
                return reply(`❌ Only ${images.length} images available. Try index 1-${images.length}\n> ⚡ Powered by TRACLE-LITE`);
            }

            const selectedImage = images[imageIndex];
            const imageUrl = selectedImage.url;
            const description = selectedImage.description || `${searchQuery} image`;
            const thumbnail = selectedImage.thumbnail;

            console.log(`📷 Selected image ${imageIndex + 1}: ${imageUrl.substring(0, 100)}...`);
            await reply(`⏳ Downloading image ${imageIndex + 1}/${images.length}...`);

            // Download the image
            const imageResponse = await axios({
                method: 'get',
                url: imageUrl,
                responseType: 'stream',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Determine file extension
            const contentType = imageResponse.headers['content-type'];
            let extension = '.jpg';
            if (contentType.includes('png')) extension = '.png';
            if (contentType.includes('gif')) extension = '.gif';
            if (contentType.includes('webp')) extension = '.webp';

            const tempFile = path.join(__dirname, `img_${Date.now()}${extension}`);
            const writer = fs.createWriteStream(tempFile);

            let downloadedBytes = 0;
            imageResponse.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                process.stdout.write(`\r📥 Downloading: ${(downloadedBytes / 1024).toFixed(2)} KB`);
            });

            await new Promise((resolve, reject) => {
                imageResponse.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`\n✅ Download complete! Size: ${(downloadedBytes / 1024).toFixed(2)} KB`);

            // Send the image
            console.log(`📤 Sending to WhatsApp...`);
            
            // Create caption with image info
            const caption = `🖼️ *Image Search Result*\n\n🔍 Query: ${searchQuery}\n📸 Image ${imageIndex + 1}/${images.length}\n📝 ${description.substring(0, 100)}\n\n> ⚡ Powered by TRACLE-LITE`;
            
            // Try to send as image first, fallback to document if too large
            const stats = fs.statSync(tempFile);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            if (fileSizeMB > 5) {
                // Send as document if > 5MB (WhatsApp compresses large images)
                await conn.sendMessage(from, {
                    document: { url: tempFile },
                    mimetype: contentType,
                    fileName: `${searchQuery.replace(/[^\w\s]/gi, '')}_${Date.now()}${extension}`,
                    caption: caption
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    image: { url: tempFile },
                    caption: caption,
                    contextInfo: {
                        externalAdReply: {
                            title: `🖼️ ${searchQuery}`,
                            body: `Image ${imageIndex + 1}/${images.length}`,
                            thumbnailUrl: thumbnail || imageUrl,
                            mediaType: 1
                        }
                    }
                }, { quoted: mek });
            }

            // Cleanup
            fs.unlinkSync(tempFile);
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            console.log(`✅ Image sent successfully!\n`);

        } catch (error) {
            console.error("\n❌ Error details:", error.message);
            if (error.response) console.error("Response status:", error.response.status);
            
            await reply(`❌ Failed to get image.\nError: ${error.message.substring(0, 100)}\n\nTry a different search term or try again later.\n> ⚡ Powered by TRACLE-LITE`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
const fetch = require('node-fetch');

module.exports = {
    pattern: 'img',
    alias: ['image', 'pic', 'photo', 'searchimg'],
    description: 'Search and send images from the web',
    category: 'utility',
    execute: async (conn, message, m, { args, q, reply, from, sender, sessionId }) => {
        try {
            if (!q && args.length === 0) {
                return await reply(
                    `🖼️ *IMAGE SEARCH*\n\nUsage:\n• .img [query] - Search for images\n• .img cat - Search for cat images\n• .img dog - Search for dog images\n\nExamples:\n• .img cat\n• .img nature\n• .img car`
                );
            }

            const query = q || args.join(' ');
            
            if (!query) {
                return await reply('❌ Please provide a search query. Example: .img cat');
            }

            // Show typing indicator
            await conn.sendPresenceUpdate('composing', from);

            // Send searching message
            const searchMsg = await reply(`🔍 Searching for images of "${query}"...`);

            try {
                // Fetch images from the API
                const apiUrl = `https://apis-keith.vercel.app/search/images?query=${encodeURIComponent(query)}`;
                console.log(`🖼️ Fetching images from: ${apiUrl}`);
                
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (!data || !data.images || !Array.isArray(data.images) || data.images.length === 0) {
                    // Delete the searching message
                    await conn.sendMessage(from, { delete: searchMsg.key });
                    return await reply(`❌ No images found for "${query}". Try a different search term.`);
                }

                // Get the first 5 images (or available images)
                const imagesToSend = data.images.slice(0, 5);
                
                // Delete the searching message
                await conn.sendMessage(from, { delete: searchMsg.key });

                let successCount = 0;
                let failedCount = 0;

                // Send each image with caption
                for (let i = 0; i < imagesToSend.length; i++) {
                    const image = imagesToSend[i];
                    
                    try {
                        await conn.sendMessage(from, {
                            image: { url: image.url },
                            caption: `🖼️ ${query.charAt(0).toUpperCase() + query.slice(1)} Image ${i + 1}/${imagesToSend.length}`,
                            contextInfo: {
                                externalAdReply: {
                                    title: `Image Search: ${query}`,
                                    body: `Result ${i + 1} of ${imagesToSend.length}`,
                                    thumbnailUrl: image.url,
                                    sourceUrl: image.url,
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        });
                        successCount++;
                        
                        // Add small delay between images to avoid rate limiting
                        if (i < imagesToSend.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    } catch (error) {
                        console.error(`❌ Failed to send image ${i + 1}:`, error.message);
                        failedCount++;
                    }
                }

                // Send summary message
                if (successCount > 0) {
                    await reply(`✅ Successfully sent ${successCount} image(s) for "${query}"${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
                } else {
                    await reply(`❌ Failed to send any images for "${query}". The images may be unavailable or corrupted.`);
                }

            } catch (apiError) {
                console.error('❌ API Error:', apiError);
                
                // Delete the searching message
                try {
                    await conn.sendMessage(from, { delete: searchMsg.key });
                } catch (e) {}
                
                await reply(`❌ Error fetching images: ${apiError.message}\n\nPlease try again later or use a different search term.`);
            }

        } catch (error) {
            console.error('Error in img command:', error);
            await reply('❌ Error processing image search request. Please try again.');
        }
    }
};
const { igdl } = require("ruhend-scraper");

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
    pattern: "ig",
    desc: "Download Instagram videos, reels, posts",
    category: "download",
    react: "📥",
    filename: __filename,
    use: ".ig [instagram_url]",

    execute: async (conn, message, m, { from, args, q }) => {
        try {
            // Check if message has already been processed
            if (processedMessages.has(message.key.id)) {
                return;
            }
            
            // Add message ID to processed set
            processedMessages.add(message.key.id);
            
            // Clean up old message IDs after 5 minutes
            setTimeout(() => {
                processedMessages.delete(message.key.id);
            }, 5 * 60 * 1000);

            // Use quoted text or command arguments
            const text = q || args.join(' ') || 
                       message.message?.conversation || 
                       message.message?.extendedTextMessage?.text;
            
            if (!text) {
                return await conn.sendMessage(from, { 
                    text: "❌ Please provide an Instagram link\n\nExample: .ig https://instagram.com/reel/xxxx"
                });
            }

            // Check for various Instagram URL formats
            const instagramPatterns = [
                /https?:\/\/(?:www\.)?instagram\.com\//,
                /https?:\/\/(?:www\.)?instagr\.am\//,
                /https?:\/\/(?:www\.)?instagram\.com\/p\//,
                /https?:\/\/(?:www\.)?instagram\.com\/reel\//,
                /https?:\/\/(?:www\.)?instagram\.com\/tv\//
            ];

            const isValidUrl = instagramPatterns.some(pattern => pattern.test(text));
            
            if (!isValidUrl) {
                return await conn.sendMessage(from, { 
                    text: "❌ Invalid Instagram link\n\nPlease provide a valid Instagram post, reel, or video link."
                });
            }

            await conn.sendMessage(from, {
                react: { text: '🔄', key: message.key }
            });

            const downloadData = await igdl(text);
            
            if (!downloadData || !downloadData.data || downloadData.data.length === 0) {
                return await conn.sendMessage(from, { 
                    text: "❌ No media found at the provided link."
                });
            }

            const mediaData = downloadData.data;
            for (let i = 0; i < Math.min(20, mediaData.length); i++) {
                const media = mediaData[i];
                const mediaUrl = media.url;

                // Check if URL ends with common video extensions
                const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) || 
                              media.type === 'video' || 
                              text.includes('/reel/') || 
                              text.includes('/tv/');

                if (isVideo) {
                    await conn.sendMessage(from, {
                        video: { url: mediaUrl },
                        mimetype: "video/mp4",
                        caption: "📥 Instagram Video Downloaded\n\n> © TRACLE - LITE 💜"
                    }, { quoted: message });
                } else {
                    await conn.sendMessage(from, {
                        image: { url: mediaUrl },
                        caption: "📸 Instagram Image Downloaded\n\n> © TRACLE - LITE 💜"
                    }, { quoted: message });
                }
            }
        } catch (error) {
            console.error('Error in Instagram command:', error);
            await conn.sendMessage(from, { 
                text: "❌ An error occurred while processing the request."
            });
        }
    }
};
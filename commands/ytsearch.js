// === ytsearch.js ===
const axios = require("axios");

module.exports = {
    pattern: "ytsearch",
    alias: ["yts", "youtube", "searchyt"],
    desc: "Search for videos on YouTube",
    category: "search",
    react: "🔍",
    filename: __filename,
    use: ".ytsearch <query>",

    execute: async (conn, mek, m, { from, args, q, reply, sessionId }) => {
        try {
            const query = q || args.join(" ");
            
            if (!query || !query.trim()) {
                return await reply(
`🔍 *YouTube Search*

❌ Please provide a search query.

📌 *Usage:*
• .ytsearch <query>
• .yts <query>

✨ *Examples:*
• .ytsearch Alan Walker
• .yts latest music 2024
• .ytsearch programming tutorials

💡 *Tip:* Use specific keywords for better results.`
                );
            }

            // React 🔍
            if (module.exports.react) {
                await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
            }

            await reply(`🔍 Searching YouTube for: *${query}*...`);

            // Using Keith YouTube Search API
            const apiUrl = `https://apis-keith.vercel.app/search/yts?query=${encodeURIComponent(query)}`;
            
            console.log(`🔍 YouTube search request: ${query}`);
            console.log(`🔗 API URL: ${apiUrl}`);

            const { data } = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            console.log(`📥 Search API Response:`, JSON.stringify(data, null, 2));

            // Handle API response format
            let videos = [];
            
            if (data && data.result) {
                videos = data.result;
            } else if (data && data.data) {
                videos = data.data;
            } else if (Array.isArray(data)) {
                videos = data;
            } else if (data && data.videos) {
                videos = data.videos;
            } else if (data && data.items) {
                videos = data.items;
            }

            if (!videos || !Array.isArray(videos) || videos.length === 0) {
                return await reply("❌ No videos found for your search. Please try different keywords.");
            }

            // Limit to first 10 results
            const searchResults = videos.slice(0, 10);
            
            // Format search results
            let resultMessage = `🔍 *YouTube Search Results for:* ${query}\n\n`;
            
            searchResults.forEach((video, index) => {
                const title = video.title || video.name || "Unknown Title";
                const duration = video.duration || video.length || "Unknown";
                const views = video.views || video.viewCount || "Unknown";
                const channel = video.channel || video.author || video.uploader || "Unknown Channel";
                const url = video.url || video.link || video.id ? `https://youtu.be/${video.id}` : "No URL";
                const thumbnail = video.thumbnail || video.thumb || null;

                resultMessage += `*${index + 1}. ${title}*\n`;
                resultMessage += `   ⏱️ *Duration:* ${duration}\n`;
                resultMessage += `   👁️ *Views:* ${views}\n`;
                resultMessage += `   👤 *Channel:* ${channel}\n`;
                resultMessage += `   🔗 *URL:* ${url}\n\n`;
            });

            resultMessage += `📊 *Found ${videos.length} results* | Showing top ${searchResults.length}\n\n`;
            resultMessage += `💡 *Tip:* Use .play <video title> to download any video\n`;
            resultMessage += `✨ *Powered by Keith API*`;

            // Send search results
            await reply(resultMessage);

            // Optional: Send first result thumbnail if available
            const firstVideo = searchResults[0];
            if (firstVideo && firstVideo.thumbnail) {
                try {
                    const thumbRes = await axios.get(firstVideo.thumbnail, { 
                        responseType: "arraybuffer", 
                        timeout: 15000 
                    });
                    const thumbBuffer = Buffer.from(thumbRes.data);
                    
                    await conn.sendMessage(from, {
                        image: thumbBuffer,
                        caption: `🎬 *Top Result:* ${firstVideo.title || "Unknown"}\n👤 ${firstVideo.channel || "Unknown Channel"}\n⏱️ ${firstVideo.duration || "Unknown"}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🔍 YouTube Search",
                                body: `Top result for: ${query.substring(0, 50)}`,
                                thumbnail: thumbBuffer,
                                mediaType: 1,
                                sourceUrl: firstVideo.url || "https://youtube.com"
                            }
                        }
                    }, { quoted: mek });
                } catch (thumbError) {
                    console.error("Thumbnail download failed:", thumbError.message);
                }
            }

        } catch (error) {
            console.error("[ytsearch.js] Error:", error.message);
            console.error("[ytsearch.js] Stack:", error.stack);
            
            let errorMessage = "❌ YouTube search failed. ";
            
            if (error.code === 'ECONNABORTED') {
                errorMessage += "Request timeout. Please try again.";
            } else if (error.response) {
                if (error.response.status === 404) {
                    errorMessage += "Search API not available.";
                } else {
                    errorMessage += `API Error: ${error.response.status}`;
                }
            } else if (error.request) {
                errorMessage += "Network error. Please check your connection.";
            } else {
                errorMessage += "Please try different search terms.";
            }
            
            await reply(errorMessage);
        }
    }
};
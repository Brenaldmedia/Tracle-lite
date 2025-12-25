const axios = require("axios");

module.exports = {
  pattern: "yts",
  aliases: ["ytsearch", "ytfind"],
  category: "Search",
  description: "Search YouTube videos",
  
  execute: async (conn, mek, m, { from, args, q, reply, sender, isGroup, groupMetadata, userSettings }) => {
    try {
      if (!q) {
        await reply("🔍 *YouTube Search*\n\nUsage: .yts [search query]\n\nExample:\n• .yts music videos\n• .yts funny cat videos");
        return;
      }

      await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
      await reply(`🔎 Searching YouTube for: *${q}*...`);

      const apiUrl = `https://apiskeith.vercel.app/search/yts?query=${encodeURIComponent(q)}`;
      const res = await axios.get(apiUrl, { timeout: 10000 });
      const results = res.data?.result;

      if (!Array.isArray(results) || results.length === 0) {
        await reply("❌ No results found for your search");
        return;
      }

      // Take top 5 results
      const videos = results.slice(0, 5);
      
      // Create a formatted message with results
      let message = `🔍 *YouTube Search Results for: ${q}*\n\n`;
      message += `📊 Found ${results.length} videos\n\n`;
      
      videos.forEach((vid, i) => {
        message += `🎬 *${i + 1}. ${vid.title}*\n`;
        message += `⏱️ Duration: ${vid.duration || 'N/A'}\n`;
        message += `👁 Views: ${vid.views || 'N/A'}\n`;
        message += `📅 Published: ${vid.published || 'N/A'}\n`;
        message += `🔗 Link: ${vid.url || 'N/A'}\n`;
        message += `📺 Channel: ${vid.channel?.name || vid.author || 'N/A'}\n`;
        message += `────────────────────\n`;
      });
      
      message += `\n💡 *Usage:* Click links above or use:\n`;
      message += `• Reply with number to get video details\n`;
      message += `• Example: Reply "1" to get first video\n`;

      // Send the results as a regular message
      await conn.sendMessage(from, { 
        text: message,
        contextInfo: {
          externalAdReply: {
            title: "🎬 YouTube Search",
            body: `Results for: ${q}`,
            thumbnailUrl: videos[0]?.thumbnail || "https://files.catbox.moe/zlu6dx.jpg",
            sourceUrl: "https://youtube.com",
            mediaType: 1
          }
        }
      }, { quoted: mek });

      // Also store videos for later selection
      const ytSearchCache = global.ytSearchCache || {};
      ytSearchCache[sender] = videos;
      global.ytSearchCache = ytSearchCache;

    } catch (error) {
      console.error("❌ YTS command error:", error.message);
      
      if (error.code === "ECONNABORTED") {
        await reply("❌ Search timeout. Please try again.");
      } else if (error.response?.status === 404) {
        await reply("❌ API endpoint not found. Please try another search method.");
      } else if (error.message.includes("network")) {
        await reply("❌ Network error. Check your connection and try again.");
      } else {
        await reply("❌ Search error. Please try a different query or check if API is working.");
      }
      
      // Fallback to simple text search
      try {
        const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&maxResults=5&type=video`;
        const fallbackRes = await axios.get(fallbackUrl, { timeout: 5000 });
        const items = fallbackRes.data?.items || [];
        
        if (items.length > 0) {
          let fallbackMsg = `🔍 *YouTube Results (Fallback):*\n\n`;
          items.forEach((item, i) => {
            const title = item.snippet.title;
            const channel = item.snippet.channelTitle;
            const videoId = item.id.videoId;
            const url = `https://youtu.be/${videoId}`;
            
            fallbackMsg += `🎬 *${i + 1}. ${title}*\n`;
            fallbackMsg += `📺 Channel: ${channel}\n`;
            fallbackMsg += `🔗 ${url}\n`;
            fallbackMsg += `────────────────────\n`;
          });
          
          await conn.sendMessage(from, { 
            text: fallbackMsg,
            contextInfo: {
              externalAdReply: {
                title: "🎬 YouTube (Fallback)",
                body: `Results for: ${q}`,
                thumbnailUrl: "https://files.catbox.moe/zlu6dx.jpg",
                sourceUrl: "https://youtube.com",
                mediaType: 1
              }
            }
          }, { quoted: mek });
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError.message);
      }
    }
  }
};
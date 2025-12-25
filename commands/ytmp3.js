const axios = require("axios");

module.exports = {
  pattern: "play",
  aliases: ["ytmp3", "ytmp3doc", "audiodoc", "yta"],
  category: "Downloader",
  description: "Download Video from Youtube",
  
  execute: async (conn, mek, m, { from, args, q, reply, sender, isGroup, groupMetadata, userSettings }) => {
    try {
      if (!q) {
        await reply("🎵 *YouTube Audio Downloader*\n\nUsage: .play [song name or YouTube link]\n\nExample:\n• .play calm down\n• .play https://youtu.be/...");
        return;
      }

      await conn.sendMessage(from, { react: { text: "🎵", key: mek.key } });
      await reply(`🔍 Searching and processing: *${q}*...`);

      let videoUrl;
      let videoTitle;
      let videoThumbnail;

      // Check if input is a YouTube URL
      if (q.match(/(youtube\.com|youtu\.be)/i)) {
        videoUrl = q;
        const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
        if (!videoId) {
          await reply("❌ Invalid YouTube URL");
          return;
        }
        videoTitle = "YouTube Audio";
        videoThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      } else {
        // Search YouTube for query
        const searchResponse = await axios.get(`https://apiskeith.vercel.app/search/yts?query=${encodeURIComponent(q)}`);
        const videos = searchResponse.data?.result;
        
        if (!Array.isArray(videos) || videos.length === 0) {
          await reply("❌ No videos found for your search");
          return;
        }

        const firstVideo = videos[0];
        videoUrl = firstVideo.url;
        videoTitle = firstVideo.title;
        videoThumbnail = firstVideo.thumbnail;
      }

      const downloadResponse = await axios.get(`https://apiskeith.vercel.app/download/audio?url=${encodeURIComponent(videoUrl)}`);
      const downloadUrl = downloadResponse.data?.result;
      
      if (!downloadUrl) {
        await reply("❌ Failed to get download URL");
        return;
      }

      const fileName = `${videoTitle}.mp3`.replace(/[^\w\s.-]/gi, '');
      
      // Send audio stream with your menu-style context
      await conn.sendMessage(from, {
        audio: { url: downloadUrl },
        mimetype: "audio/mpeg",
        fileName,
        ptt: false,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200,
          },
          externalAdReply: {
            title: `🎵 ${videoTitle}`,
            body: 'YouTube Audio - Powered by BrenaldMedia',
            thumbnailUrl: videoThumbnail,
            sourceUrl: videoUrl,
            mediaType: 1
          }
        }
      }, { quoted: mek });

      // Send document stream with your menu-style context
      await conn.sendMessage(from, {
        document: { url: downloadUrl },
        mimetype: "audio/mpeg",
        fileName,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200,
          },
          externalAdReply: {
            title: `📁 ${videoTitle}`,
            body: 'Document Version - Powered by BrenaldMedia',
            thumbnailUrl: videoThumbnail,
            sourceUrl: videoUrl,
            mediaType: 1
          }
        }
      }, { quoted: mek });

      console.log(`✅ Sent audio: ${videoTitle}`);

    } catch (error) {
      console.error("❌ Play command error:", error.message);
      
      // Send error with your menu-style context
      await conn.sendMessage(from, { 
        text: error.code === "ECONNABORTED" ? 
          "❌ Request timeout. Please try again." : 
          "❌ API error. Please try another song or check your link.",
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200,
          }
        }
      }, { quoted: mek });
    }
  }
};
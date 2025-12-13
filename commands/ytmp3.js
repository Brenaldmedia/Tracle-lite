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
      
      // Enhanced context info with premium template
      const contextInfo = {
        externalAdReply: {
          title: videoTitle,
          body: 'Powered by Brenaldmedia',
          mediaType: 1,
          sourceUrl: videoUrl,
          thumbnailUrl: videoThumbnail,
          renderLargerThumbnail: false,
          showAdAttribution: true
        },
        forwardingScore: 999,
        isForwarded: false,
        stanzaId: "CMD" + Date.now(),
        participant: conn.user?.id
      };

      // Send audio stream with enhanced context
      await conn.sendMessage(from, {
        audio: { url: downloadUrl },
        mimetype: "audio/mpeg",
        fileName,
        ptt: false,
        contextInfo: contextInfo
      }, { quoted: mek });

      // Send document stream with enhanced context
      await conn.sendMessage(from, {
        document: { url: downloadUrl },
        mimetype: "audio/mpeg",
        fileName,
        contextInfo: {
          externalAdReply: {
            ...contextInfo.externalAdReply,
            body: 'Document version - Powered by Brenaldmedia'
          },
          forwardingScore: 999,
          isForwarded: false,
          stanzaId: "DOC" + Date.now(),
          participant: conn.user?.id
        }
      }, { quoted: mek });

      console.log(`✅ Sent audio: ${videoTitle}`);

    } catch (error) {
      console.error("❌ Play command error:", error.message);
      if (error.code === "ECONNABORTED") {
        await reply("❌ Request timeout. Please try again.");
      } else {
        await reply("❌ API error. Please try another song or check your link.");
      }
    }
  }
};
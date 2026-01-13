const axios = require("axios");

module.exports = {
  pattern: "tiktok",
  desc: "Download TikTok video without watermark",
  react: "🧑‍💻",
  category: "downloader",
  filename: __filename,
  use: ".tiktok <link>",

  execute: async (conn, mek, m, { from, reply, q }) => {
    // Helper function to send messages with contextInfo
    const sendMessageWithContext = async (text, quoted = mek) => {
      return await conn.sendMessage(from, {
        text: text,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1
          }
        }
      }, { quoted: quoted });
    };

    try {
      if (!q) return await sendMessageWithContext("⚠️ Please provide a TikTok link.");
      
      // Check for TikTok URL patterns
      const tiktokPatterns = [
        /https?:\/\/(?:www\.)?tiktok\.com\//,
        /https?:\/\/(?:vm\.)?tiktok\.com\//,
        /https?:\/\/(?:vt\.)?tiktok\.com\//,
        /https?:\/\/(?:www\.)?tiktok\.com\/@/,
        /https?:\/\/(?:www\.)?tiktok\.com\/t\//
      ];
      
      const isValidUrl = tiktokPatterns.some(pattern => pattern.test(q));
      if (!isValidUrl) return await sendMessageWithContext("❌ Invalid TikTok link. Please provide a valid TikTok URL.");

      // React first
      if (module.exports.react) {
        await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
      }

      // Inform user
      await sendMessageWithContext("⏳ Downloading TikTok video, please wait...");

      // Try multiple API endpoints for better reliability
      let videoData = null;
      let error = null;
      
      // List of APIs to try (in order of preference)
      const apis = [
        // Primary API - TikTok Downloader API
        async () => {
          const apiUrl = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(q)}`;
          const response = await axios.get(apiUrl, { timeout: 30000 });
          
          if (response.data && response.data.videoUrl) {
            return {
              success: true,
              videoUrl: response.data.videoUrl,
              title: response.data.title || "TikTok Video",
              author: {
                nickname: response.data.author?.name || "Unknown",
                username: response.data.author?.id || "unknown"
              },
              stats: {
                like: response.data.likeCount || 0,
                comment: response.data.commentCount || 0,
                share: response.data.shareCount || 0
              }
            };
          }
          throw new Error("No video URL found");
        },
        
        // Backup API - TikWM
        async () => {
          const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(q)}&hd=1`;
          const response = await axios.get(apiUrl, { timeout: 30000 });
          
          if (response.data && response.data.data && response.data.data.play) {
            return {
              success: true,
              videoUrl: response.data.data.play,
              title: response.data.data.title || "TikTok Video",
              author: {
                nickname: response.data.data.author?.nickname || "Unknown",
                username: response.data.data.author?.unique_id || "unknown"
              },
              stats: {
                like: response.data.data.digg_count || 0,
                comment: response.data.data.comment_count || 0,
                share: response.data.data.share_count || 0
              }
            };
          }
          throw new Error("No video URL found");
        },
        
        // Secondary Backup - SnapTik
        async () => {
          // First get the video key
          const keyUrl = `https://api.snaptik.site/video-key?video_url=${encodeURIComponent(q)}`;
          const keyResponse = await axios.get(keyUrl, { timeout: 30000 });
          
          if (keyResponse.data && keyResponse.data.success) {
            const videoKey = keyResponse.data.data.key;
            const videoUrl = `https://api.snaptik.site/video?key=${videoKey}`;
            
            // Get video info from another endpoint
            const infoUrl = `https://api.snaptik.site/video-details?key=${videoKey}`;
            let info = {};
            
            try {
              const infoResponse = await axios.get(infoUrl, { timeout: 15000 });
              if (infoResponse.data && infoResponse.data.success) {
                info = infoResponse.data.data;
              }
            } catch (e) {
              // Info fetch failed, but we still have the video
            }
            
            return {
              success: true,
              videoUrl: videoUrl,
              title: info.title || "TikTok Video",
              author: {
                nickname: info.author?.name || "Unknown",
                username: info.author?.username || "unknown"
              },
              stats: {
                like: info.likes || 0,
                comment: info.comments || 0,
                share: info.shares || 0
              }
            };
          }
          throw new Error("Failed to get video key");
        },
        
        // Fallback API - TikDown
        async () => {
          const apiUrl = `https://api.tikdown.org/api/download?url=${encodeURIComponent(q)}`;
          const response = await axios.get(apiUrl, { timeout: 30000 });
          
          if (response.data && response.data.video) {
            return {
              success: true,
              videoUrl: response.data.video,
              title: response.data.desc || "TikTok Video",
              author: {
                nickname: response.data.author?.name || "Unknown",
                username: response.data.author?.id || "unknown"
              },
              stats: {
                like: response.data.likes || 0,
                comment: response.data.comments || 0,
                share: response.data.shares || 0
              }
            };
          }
          throw new Error("No video found");
        }
      ];

      // Try each API until one works
      for (let i = 0; i < apis.length; i++) {
        try {
          console.log(`Trying API ${i + 1}...`);
          videoData = await apis[i]();
          if (videoData && videoData.success) {
            console.log(`API ${i + 1} successful!`);
            break;
          }
        } catch (apiError) {
          error = apiError;
          console.log(`API ${i + 1} failed:`, apiError.message);
          continue; // Try next API
        }
      }

      if (!videoData || !videoData.success) {
        return await sendMessageWithContext(`❌ Failed to download TikTok video. All APIs failed.\n\nError: ${error?.message || "Unknown error"}`);
      }

      const caption =
        `🎵 *TikTok Video* 🎵\n\n` +
        `👤 *User:* ${videoData.author.nickname} (@${videoData.author.username})\n` +
        `📖 *Title:* ${videoData.title}\n` +
        `👍 *Likes:* ${videoData.stats.like}\n` +
        `💬 *Comments:* ${videoData.stats.comment}\n` +
        `🔁 *Shares:* ${videoData.stats.share}\n\n` +
        `> Powered By TRACLE - LITE`;

      await conn.sendMessage(from, {
        video: { url: videoData.videoUrl },
        caption: caption,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1
          }
        }
      }, { quoted: mek });

    } catch (error) {
      console.error("❌ TikTok Downloader Error:", error);
      await sendMessageWithContext(`⚠️ Error downloading TikTok video:\n${error.message}`);
    }
  }
};
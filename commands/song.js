const axios = require("axios");
const yts = require("yt-search");

module.exports = {
  pattern: "song",
  aliases: ["play", "ytmp3", "music"],
  category: "download",
  desc: "Download music from YouTube",
  react: "🎵",
  filename: __filename,
  use: ".song [song_name or youtube_url]",

  execute: async (conn, message, m, { from, q, args }) => {
    try {
      const searchQuery = q || args.join(' ') || '';
      
      if (!searchQuery) {
        return await conn.sendMessage(from, { 
          text: "🎵 *YouTube Music Downloader*\n\nUsage: .song [song name or YouTube link]\n\nExamples:\n• .song calm down\n• .song https://youtu.be/...\n• .song https://www.youtube.com/watch?v=...",
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363401559573199@newsletter",
              newsletterName: "BrenaldMedia",
              serverMessageId: -1,
            }
          }
        }, { quoted: message });
      }

      await conn.sendMessage(from, { react: { text: "🎵", key: m.key } });
      await conn.sendMessage(from, { 
        text: `🔍 Searching: *${searchQuery}*...`,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
          }
        }
      }, { quoted: message });

      let videoUrl;
      let videoTitle;
      let videoThumbnail;
      let videoId;

      // Check if input is a YouTube URL
      if (searchQuery.match(/(youtube\.com|youtu\.be)/i)) {
        videoUrl = searchQuery;
        videoId = searchQuery.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
        if (!videoId) {
          return await conn.sendMessage(from, { 
            text: "❌ Invalid YouTube URL. Please provide a valid YouTube link.",
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363401559573199@newsletter",
                newsletterName: "BrenaldMedia",
                serverMessageId: -1,
              }
            }
          }, { quoted: message });
        }
        
        // Get video info from YouTube
        try {
          const searchResult = await yts({ videoId });
          if (searchResult) {
            videoTitle = searchResult.title;
            videoThumbnail = searchResult.thumbnail;
          } else {
            videoTitle = "YouTube Audio";
            videoThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          }
        } catch (e) {
          videoTitle = "YouTube Audio";
          videoThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }
      } else {
        // Search YouTube for query
        try {
          const searchResponse = await yts(searchQuery);
          const videos = searchResponse.videos;
          
          if (!Array.isArray(videos) || videos.length === 0) {
            return await conn.sendMessage(from, { 
              text: `❌ No songs found for: *${searchQuery}*`,
              contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "120363401559573199@newsletter",
                  newsletterName: "BrenaldMedia",
                  serverMessageId: -1,
                }
              }
            }, { quoted: message });
          }

          const firstVideo = videos[0];
          videoUrl = firstVideo.url;
          videoTitle = firstVideo.title;
          videoThumbnail = firstVideo.thumbnail;
          videoId = firstVideo.videoId;
        } catch (error) {
          console.error("YouTube search error:", error);
          return await conn.sendMessage(from, { 
            text: "❌ Search failed. Please try again.",
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363401559573199@newsletter",
                newsletterName: "BrenaldMedia",
                serverMessageId: -1,
              }
            }
          }, { quoted: message });
        }
      }

      // Send loading message with thumbnail
      await conn.sendMessage(from, {
        image: { url: videoThumbnail },
        caption: `🎵 *${videoTitle}*\n\n⬇️ Downloading audio...\n\nPlease wait...`,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
          },
          externalAdReply: {
            title: "🎵 YouTube Music Download",
            body: "Powered by BrenaldMedia",
            thumbnailUrl: videoThumbnail,
            sourceUrl: videoUrl,
            mediaType: 1
          }
        }
      }, { quoted: message });

      // Try multiple API endpoints
      const apiEndpoints = [
        `https://apiskeith.vercel.app/download/audio?url=${encodeURIComponent(videoUrl)}`,
        `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
        `https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${encodeURIComponent(videoUrl)}`,
        `https://yt-api-six.vercel.app/audio?url=${encodeURIComponent(videoUrl)}`,
        `https://api.download-lagu-mp3.com/@api/button/mp3/${videoId}`,
      ];

      let downloadUrl = null;
      let apiError = null;

      for (const endpoint of apiEndpoints) {
        try {
          console.log(`Trying API: ${endpoint}`);
          const response = await axios.get(endpoint, { timeout: 10000 });
          
          // Different API response formats
          if (endpoint.includes("apiskeith")) {
            if (response.data?.result) {
              downloadUrl = response.data.result;
              break;
            }
          } else if (endpoint.includes("ryzendesu")) {
            if (response.data?.status && response.data?.download) {
              downloadUrl = response.data.download;
              break;
            }
          } else if (endpoint.includes("giftedtech")) {
            if (response.data?.result?.url) {
              downloadUrl = response.data.result.url;
              break;
            }
          } else if (endpoint.includes("yt-api-six")) {
            if (response.data?.url) {
              downloadUrl = response.data.url;
              break;
            }
          } else if (endpoint.includes("download-lagu-mp3")) {
            // Parse HTML response for this API
            const html = response.data;
            const match = html.match(/href="([^"]+\.mp3[^"]*)"/i);
            if (match && match[1]) {
              downloadUrl = match[1];
              break;
            }
          }
        } catch (error) {
          apiError = error.message;
          console.log(`API failed: ${endpoint} - ${error.message}`);
          continue;
        }
      }

      if (!downloadUrl) {
        return await conn.sendMessage(from, { 
          text: "❌ All download APIs failed. Please try again later.",
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363401559573199@newsletter",
              newsletterName: "BrenaldMedia",
              serverMessageId: -1,
            }
          }
        }, { quoted: message });
      }

      const fileName = `${videoTitle.replace(/[^\w\s.-]/gi, '')}.mp3`.substring(0, 100);

      // Send as audio message
      await conn.sendMessage(from, {
        audio: { url: downloadUrl },
        mimetype: "audio/mpeg",
        fileName: fileName,
        ptt: false,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
          },
          externalAdReply: {
            title: `🎵 ${videoTitle.substring(0, 60)}${videoTitle.length > 60 ? '...' : ''}`,
            body: 'YouTube Audio - Powered by BrenaldMedia',
            thumbnailUrl: videoThumbnail,
            sourceUrl: videoUrl,
            mediaType: 1
          }
        }
      }, { quoted: message });

      // Optional: Send as document (uncomment if needed)
      /*
      await conn.sendMessage(from, {
        document: { url: downloadUrl },
        mimetype: "audio/mpeg",
        fileName: fileName,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
          },
          externalAdReply: {
            title: `📁 ${videoTitle.substring(0, 60)}${videoTitle.length > 60 ? '...' : ''}`,
            body: 'Document Version - Powered by BrenaldMedia',
            thumbnailUrl: videoThumbnail,
            sourceUrl: videoUrl,
            mediaType: 1
          }
        }
      }, { quoted: message });
      */

      console.log(`✅ Song downloaded: ${videoTitle}`);

    } catch (error) {
      console.error("❌ Song command error:", error.message);
      
      await conn.sendMessage(from, { 
        text: error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" ? 
          "❌ Request timeout. Please try again." : 
          "❌ Download error. Please try another song.",
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
          }
        }
      }, { quoted: message });
    }
  }
};
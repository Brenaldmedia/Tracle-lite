const youtubeDownloader = require('../youtube'); // Adjust path as needed

module.exports = {
  pattern: "youtube",
  desc: "Download YouTube videos/audio",
  react: "🎬",
  category: "downloader",
  filename: __filename,
  use: `.youtube <url> [quality]\n.youtube audio <url>\n.youtube search <query>`,
  
  execute: async (conn, mek, m, { from, reply, q, args, command }) => {
    // Helper function
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
      if (!q) {
        return await sendMessageWithContext(
          `🎬 *YouTube Downloader - Tracle-Lite*\n\n` +
          `*Usage:*\n` +
          `• .youtube <url> - Download video\n` +
          `• .youtube audio <url> - Download as MP3\n` +
          `• .youtube search <query> - Search videos\n\n` +
          `> Powered By TRACLE - LITE`
        );
      }

      // React to show processing
      if (module.exports.react) {
        await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
      }

      // Check if it's a URL
      if (youtubeDownloader.isYouTubeUrl(q)) {
        // Check if it's audio download
        if (args[0]?.toLowerCase() === 'audio') {
          const url = args[1] || q;
          
          // Download audio directly (no intermediate message)
          const result = await youtubeDownloader.downloadAudio(url);
          
          await conn.sendMessage(from, {
            audio: { url: result.path },
            mimetype: 'audio/mpeg',
            fileName: `${result.meta.title.substring(0, 50)}.mp3`,
            caption: `🎵 *${result.meta.title}*\n⬇️ Downloaded via Tracle-Lite`,
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
          
          // Cleanup
          youtubeDownloader.cleanup(result.path);
          
        } else {
          // Download video directly (no intermediate message)
          const quality = args[1] || '360';
          const result = await youtubeDownloader.downloadVideo(q, quality);
          
          await conn.sendMessage(from, {
            video: { url: result.path },
            caption: `🎬 *${result.meta.title}*\n🎬 Quality: ${result.meta.quality}\n⬇️ Downloaded via Tracle-Lite`,
            fileName: `${result.meta.title.substring(0, 50)}.mp4`,
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
          
          // Cleanup
          youtubeDownloader.cleanup(result.path);
        }
        
      } else if (args[0]?.toLowerCase() === 'search') {
        // Search functionality
        const query = args.slice(1).join(' ');
        if (!query) return await sendMessageWithContext("⚠️ Please provide a search query.");
        
        const results = await youtubeDownloader.searchVideos(query);
        
        if (!results.length) {
          return await sendMessageWithContext("❌ No results found for your search.");
        }
        
        let searchResults = `🔍 *YouTube Search Results*\n\n`;
        results.slice(0, 5).forEach((video, index) => {
          searchResults += 
            `${index + 1}. *${video.title}*\n` +
            `   👤 ${video.author} | ⏱️ ${video.duration}\n` +
            `   👁️ ${video.views} | 🔗 ${video.url}\n\n`;
        });
        
        searchResults += `\n*Usage:* .youtube <url> to download\n\n> Tracle-Lite`;
        
        await sendMessageWithContext(searchResults);
        
      } else {
        await sendMessageWithContext("❌ Please provide a valid YouTube URL or use 'search' command.");
      }

    } catch (error) {
      console.error("❌ YouTube Downloader Error:", error);
      
      let errorMsg = "⚠️ Error: ";
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMsg += "YouTube is blocking downloads. Please try again later or use a different video.";
      } else if (error.message.includes('timeout')) {
        errorMsg += "Download timed out. The video might be too long.";
      } else if (error.message.includes('No format found')) {
        errorMsg += "This video format is not available.";
      } else {
        errorMsg += error.message;
      }
      
      await sendMessageWithContext(errorMsg);
    }
  }
};
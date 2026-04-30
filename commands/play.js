const axios = require("axios");

module.exports = {
  pattern: "play",
  alias: ["music", "song", "audio", "deezer"],
  category: "downloader",
  description: "Search and play music from Deezer",
  
  execute: async (conn, mek, m, { from, args, q, reply }) => {
    try {
      if (!q) {
        await reply(`🎵 *Music Player*

Usage: .play [song name - artist]

Examples:
• .play Shape of You
• .play Shape of You - Ed Sheeran
• .play Blinding Lights

> ⚡ Powered by Tracle-Lite`);
        return;
      }

      await conn.sendMessage(from, { react: { text: "🎵", key: mek.key } });

      // Search on Deezer
      const searchUrl = `https://api.silvatech.co.ke/music/deezer/search?q=${encodeURIComponent(q)}&limit=1`;
      const searchRes = await axios.get(searchUrl, { timeout: 15000 });

      if (!searchRes.data?.status || !searchRes.data?.result || searchRes.data.result.length === 0) {
        await reply(`❌ No results found for "${q}"\n\n> ⚡ Powered by Tracle-Lite`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return;
      }

      const firstTrack = searchRes.data.result[0];

      const songTitle = firstTrack.title;
      const artistName = firstTrack.artist.name;
      const previewUrl = firstTrack.preview;
      const coverArt = firstTrack.album.cover;
      const duration = firstTrack.duration;
      const deezerUrl = firstTrack.url;

      if (!previewUrl) {
        await reply(`❌ No preview available for "${songTitle}"\n\n> ⚡ Powered by Tracle-Lite`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return;
      }

      // Format duration
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Send audio only
      await conn.sendMessage(from, {
        audio: { url: previewUrl },
        mimetype: "audio/mpeg",
        fileName: `${songTitle} - ${artistName}.mp3`,
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
            title: `🎵 ${songTitle}`,
            body: `${artistName} • ${durationText}`,
            thumbnailUrl: coverArt,
            sourceUrl: deezerUrl,
            mediaType: 1
          }
        }
      }, { quoted: mek });

      await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
      console.error("Play command error:", error.message);
      
      let errorMsg = "❌ Failed to play music.";
      
      if (error.code === "ECONNABORTED") {
        errorMsg = "❌ Request timeout. Try again.";
      } else if (error.response?.status === 404) {
        errorMsg = "❌ Service unavailable. Try later.";
      }
      
      await reply(`${errorMsg}\n\n> ⚡ Powered by Tracle-Lite`);
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
    }
  }
};
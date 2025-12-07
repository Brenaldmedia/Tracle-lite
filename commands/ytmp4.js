const axios = require("axios");

module.exports = {
  pattern: "ytmp4",
  desc: "Download YouTube video in MP4 format using David Cyril API",
  react: "🎬",
  category: "downloader",
  filename: __filename,

  execute: async (conn, mek, m, { from, q, reply }) => {
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
            serverMessageId: 200
          }
        }
      }, { quoted: quoted });
    };

    try {
      if (!q) return await sendMessageWithContext("❌ Please provide a YouTube video link.");

      // React 🎬
      if (module.exports.react) {
        await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
      }

      await sendMessageWithContext("⏳ Downloading YouTube video, please wait...");

      // API call
      const apiUrl = `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(q)}&apikey=`;
      const { data } = await axios.get(apiUrl);

      if (!data || !data.result || !data.result.download_url) {
        return await sendMessageWithContext("❌ Failed to fetch YouTube video from the API.");
      }

      const { download_url, title, thumbnail, quality, duration } = data.result;

      const caption = `🎬 *YouTube Video*\n\n` +
                      `📖 *Title:* ${title || "Unknown"}\n` +
                      `🎚️ *Quality:* ${quality || "Unknown"}\n` +
                      `⏱️ *Duration:* ${duration ? duration + "s" : "Unknown"}\n\n` +
                      `> Powered By BrenaldMedia`;

      // Prepare thumbnail buffer if exists
      let thumbBuffer;
      if (thumbnail) {
        try {
          const res = await axios.get(thumbnail, { responseType: "arraybuffer" });
          thumbBuffer = Buffer.from(res.data);
        } catch {}
      }

      // Send the video with contextInfo
      await conn.sendMessage(from, {
        video: { url: download_url },
        caption: caption,
        jpegThumbnail: thumbBuffer,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200
          }
        }
      }, { quoted: mek });

    } catch (error) {
      console.error("❌ YouTube Downloader Error:", error);
      await sendMessageWithContext(`⚠️ Error downloading YouTube video: ${error.message}`);
    }
  }
};
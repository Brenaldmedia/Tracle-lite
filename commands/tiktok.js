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
            serverMessageId: 200
          }
        }
      }, { quoted: quoted });
    };

    try {
      if (!q) return await sendMessageWithContext("⚠️ Please provide a TikTok link.");
      if (!q.includes("tiktok.com")) return await sendMessageWithContext("❌ Invalid TikTok link.");

      // React first
      if (module.exports.react) {
        await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
      }

      // Inform user
      await sendMessageWithContext("⏳ Downloading TikTok video, please wait...");

      // Fetch video from API
      const apiUrl = `https://delirius-apiofc.vercel.app/download/tiktok?url=${encodeURIComponent(q)}`;
      const { data } = await axios.get(apiUrl);

      if (!data.status || !data.data) return await sendMessageWithContext("❌ Failed to fetch TikTok video.");

      const { title, like, comment, share, author, meta } = data.data;
      const videoUrl = meta.media.find(v => v.type === "video")?.org;

      if (!videoUrl) return await sendMessageWithContext("❌ No video found in the TikTok.");

      const caption =
        `🎵 *TikTok Video* 🎵\n\n` +
        `👤 *User:* ${author.nickname} (@${author.username})\n` +
        `📖 *Title:* ${title}\n` +
        `👍 *Likes:* ${like}\n💬 *Comments:* ${comment}\n🔁 *Shares:* ${share}\n\n` +
        `> Powered By TRACLE - LITE `;

      await conn.sendMessage(from, {
        video: { url: videoUrl },
        caption: caption,
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
      console.error("❌ TikTok Downloader Error:", error);
      await sendMessageWithContext(`⚠️ Error downloading TikTok video:\n${error.message}`);
    }
  }
};
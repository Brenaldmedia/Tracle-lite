let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "quoteaudio",
  desc: "Get a random quote as audio",
  category: "fun",
  react: "🎧",
  filename: __filename,

  execute: async (conn, mek, m, { from, reply }) => {
    const sendMessageWithContext = async (text, quoted = mek, mentions = []) => {
      return await conn.sendMessage(from, {
        text: text,
        mentions: mentions,
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
      if (module.exports.react) {
        await conn.sendMessage(from, {
          react: { text: module.exports.react, key: mek.key },
        });
      }

      const response = await fetchFn("https://apiskeith.top/fun/quoteaudio");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch quote audio.");
      const data = await response.json();

      const audioUrl = data?.result || data?.audio || data?.url || null;
      if (!audioUrl) return await sendMessageWithContext("⚠️ No quote audio found.");

      await conn.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: "quote.mp3",
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

    } catch (err) {
      console.error("Error in quoteaudio.js:", err);
      await sendMessageWithContext("⚠️ Error fetching quote audio. Try again later.");
    }
  },
};
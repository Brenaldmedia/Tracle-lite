let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "meme",
  desc: "Get a random meme image",
  category: "fun",
  react: "😂",
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

      const response = await fetchFn("https://apiskeith.top/fun/meme");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch meme.");
      const data = await response.json();

      const memeUrl = data?.result || data?.url || data?.image || null;
      if (!memeUrl) return await sendMessageWithContext("⚠️ No meme found.");

      await conn.sendMessage(from, {
        image: { url: memeUrl },
        caption: `😂 *RANDOM MEME*\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`,
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
      console.error("Error in meme.js:", err);
      await sendMessageWithContext("⚠️ Error fetching meme. Try again later.");
    }
  },
};
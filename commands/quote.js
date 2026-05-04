let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "quote",
  desc: "Get a random quote",
  category: "fun",
  react: "💬",
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

      const response = await fetchFn("https://apiskeith.top/fun/quote");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch quote.");
      const data = await response.json();

      const quoteText = data?.result || data?.quote || null;
      const author = data?.author || 'Unknown';

      if (!quoteText) return await sendMessageWithContext("⚠️ No quote found.");

      await sendMessageWithContext(`💬 *QUOTE*\n━━━━━━━━━━━━━━━━━━━━\n\n"${quoteText}"\n\n— ${author}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);

    } catch (err) {
      console.error("Error in quote.js:", err);
      await sendMessageWithContext("⚠️ Error fetching quote. Try again later.");
    }
  },
};
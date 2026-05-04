let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "wyr",
  desc: "Get a random 'Would You Rather' question",
  category: "fun",
  react: "🤔",
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

      const response = await fetchFn("https://apiskeith.top/fun/wyr");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch Would You Rather.");
      const data = await response.json();

      const wyrText = data?.result || data?.question || data?.wyr || null;
      if (!wyrText) return await sendMessageWithContext("⚠️ No question found.");

      await sendMessageWithContext(`🤔 *WOULD YOU RATHER*\n━━━━━━━━━━━━━━━━━━━━\n\n${wyrText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);

    } catch (err) {
      console.error("Error in wyr.js:", err);
      await sendMessageWithContext("⚠️ Error fetching question. Try again later.");
    }
  },
};
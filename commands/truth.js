let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "truth",
  desc: "Get a random truth question",
  category: "fun",
  react: "💀",
  filename: __filename,

  execute: async (conn, mek, m, { from, isGroup, reply }) => {
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

      const response = await fetchFn("https://apiskeith.top/fun/truth");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch truth question.");
      const data = await response.json();

      const truthText = data?.result || data?.question || data?.truth || null;
      if (!truthText) return await sendMessageWithContext("⚠️ No truth question found.");

      await sendMessageWithContext(`💀 *TRUTH*\n━━━━━━━━━━━━━━━━━━━━\n\n${truthText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);

    } catch (err) {
      console.error("Error in truth.js:", err);
      await sendMessageWithContext("⚠️ Error fetching truth question. Try again later.");
    }
  },
};
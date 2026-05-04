let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "nhie",
  desc: "Get a random 'Never Have I Ever' statement",
  category: "fun",
  react: "🙈",
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

      const response = await fetchFn("https://apiskeith.top/fun/nhie");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch Never Have I Ever.");
      const data = await response.json();

      const nhieText = data?.result || data?.question || data?.text || null;
      if (!nhieText) return await sendMessageWithContext("⚠️ No statement found.");

      await sendMessageWithContext(`🙈 *NEVER HAVE I EVER*\n━━━━━━━━━━━━━━━━━━━━\n\n${nhieText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);

    } catch (err) {
      console.error("Error in nhie.js:", err);
      await sendMessageWithContext("⚠️ Error fetching statement. Try again later.");
    }
  },
};
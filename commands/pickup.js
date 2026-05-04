let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "pickupline",
  desc: "Get a random pickup line",
  category: "fun",
  react: "💕",
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

      const response = await fetchFn("https://apiskeith.top/fun/pickup");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch pickup line.");
      const data = await response.json();

      const pickupText = data?.result || data?.line || data?.pickup || null;
      if (!pickupText) return await sendMessageWithContext("⚠️ No pickup line found.");

      await sendMessageWithContext(`💕 *PICKUP LINE*\n━━━━━━━━━━━━━━━━━━━━\n\n${pickupText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);

    } catch (err) {
      console.error("Error in pickup.js:", err);
      await sendMessageWithContext("⚠️ Error fetching pickup line. Try again later.");
    }
  },
};
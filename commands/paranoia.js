let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "paranoia",
  desc: "Get a random paranoia question",
  category: "fun",
  react: "👀",
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

      const response = await fetchFn("https://apiskeith.top/fun/paranoia");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch paranoia question.");
      const data = await response.json();

      const paranoiaText = data?.result || data?.question || data?.paranoia || null;
      if (!paranoiaText) return await sendMessageWithContext("⚠️ No paranoia question found.");

      await sendMessageWithContext(`👀 *PARANOIA*\n━━━━━━━━━━━━━━━━━━━━\n\n${paranoiaText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);

    } catch (err) {
      console.error("Error in paranoia.js:", err);
      await sendMessageWithContext("⚠️ Error fetching paranoia question. Try again later.");
    }
  },
};
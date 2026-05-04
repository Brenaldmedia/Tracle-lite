let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "insult",
  desc: "Get a random insult (can mention a user)",
  category: "fun",
  react: "😤",
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
      const rawTarget = m.mentionedJid?.[0] || mek.message?.extendedTextMessage?.contextInfo?.participant;

      if (module.exports.react) {
        await conn.sendMessage(from, {
          react: { text: module.exports.react, key: mek.key },
        });
      }

      const response = await fetchFn("https://apiskeith.top/fun/insult");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch insult.");
      const data = await response.json();

      const insultText = data?.result || data?.insult || null;
      if (!insultText) return await sendMessageWithContext("⚠️ No insult found.");

      if (rawTarget && isGroup) {
        await sendMessageWithContext(`😤 @${rawTarget.split("@")[0]}, ${insultText}`, mek, [rawTarget]);
      } else {
        await sendMessageWithContext(`😤 *INSULT*\n━━━━━━━━━━━━━━━━━━━━\n\n${insultText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);
      }

    } catch (err) {
      console.error("Error in insult.js:", err);
      await sendMessageWithContext("⚠️ Error fetching insult. Try again later.");
    }
  },
};
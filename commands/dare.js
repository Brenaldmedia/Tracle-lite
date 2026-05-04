let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "dare",
  desc: "Give a dare to a user (mention or reply)",
  category: "fun",
  react: "😈",
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
      if (!isGroup) {
        return await sendMessageWithContext("❌ This command can only be used in groups.");
      }

      const rawTarget = m.mentionedJid?.[0] || mek.message?.extendedTextMessage?.contextInfo?.participant;

      if (module.exports.react) {
        await conn.sendMessage(from, {
          react: { text: module.exports.react, key: mek.key },
        });
      }

      const response = await fetchFn("https://apiskeith.top/fun/dare");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch dare.");
      const data = await response.json();

      const dareText = data?.result || data?.dare || null;
      if (!dareText) return await sendMessageWithContext("⚠️ No dare found.");

      if (rawTarget) {
        await sendMessageWithContext(`😈 @${rawTarget.split("@")[0]}, your dare is:\n\n${dareText}`, mek, [rawTarget]);
      } else {
        await sendMessageWithContext(`😈 *DARE*\n━━━━━━━━━━━━━━━━━━━━\n\n${dareText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);
      }

    } catch (err) {
      console.error("Error in dare.js:", err);
      await sendMessageWithContext("⚠️ Error fetching dare. Try again later.");
    }
  },
};
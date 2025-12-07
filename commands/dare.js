let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "dare",
  desc: "Give a dare to a user",
  category: "fun",
  react: "🎲",
  filename: __filename,

  execute: async (conn, mek, m, { from, isGroup, reply }) => {
    // Helper function to send messages with contextInfo
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
            serverMessageId: 200
          }
        }
      }, { quoted: quoted });
    };

    try {
      if (!isGroup) {
        return await sendMessageWithContext("❌ This command can only be used in groups.");
      }

      const rawTarget =
        m.mentionedJid?.[0] ||
        mek.message?.extendedTextMessage?.contextInfo?.participant;

      if (!rawTarget) {
        return await sendMessageWithContext("Please mention or reply to a user.\nUsage: `.dare @user`");
      }

      // React first
      if (module.exports.react) {
        await conn.sendMessage(from, {
          react: { text: module.exports.react, key: mek.key },
        });
      }

      // ✅ New API
      const apiUrl = "https://apis.davidcyriltech.my.id/dare?apikey";
      const res = await fetchFn(apiUrl);
      if (!res.ok) return await sendMessageWithContext("⚠️ Failed to fetch dare from API.");
      const data = await res.json();

      const dareText = data?.question || null;
      if (!dareText) return await sendMessageWithContext("⚠️ No dare found.");

      const message = `🎲 @${rawTarget.split("@")[0]}, your dare is:\n\n${dareText}`;

      // Send the dare message with contextInfo
      await sendMessageWithContext(message, mek, [rawTarget]);

    } catch (err) {
      console.error("Error in dare.js:", err);
      await sendMessageWithContext("⚠️ Error fetching dare. Try again later.");
    }
  },
};
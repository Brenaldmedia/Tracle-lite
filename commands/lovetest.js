module.exports = {
  pattern: "lovetest",
  desc: "Check love compatibility between two users",
  category: "fun",
  react: "❤️",
  filename: __filename,
  use: "@tag1 @tag2",

  execute: async (conn, mek, m, { from, isGroup, reply }) => {
    try {
      if (!isGroup) return reply("❌ This command can only be used in groups.");
      if (!m.mentionedJid || m.mentionedJid.length < 2) {
        return reply("❌ Tag two users!\nExample: `.lovetest @user1 @user2`");
      }

      const user1 = m.mentionedJid[0];
      const user2 = m.mentionedJid[1];
      const lovePercent = Math.floor(Math.random() * 100) + 1;

      const messages = [
        { range: [90, 100], text: "💖 *A match made in heaven!* True love exists!" },
        { range: [75, 89], text: "😍 *Strong connection!* This love is deep and meaningful." },
        { range: [50, 74], text: "😊 *Good compatibility!* You both can make it work." },
        { range: [30, 49], text: "🤔 *It's complicated!* Needs effort, but possible!" },
        { range: [10, 29], text: "😅 *Not the best match!* Maybe try being just friends?" },
        { range: [1, 9], text: "💔 *Uh-oh!* This love is as real as a Bollywood breakup!" }
      ];

      const loveMessage = messages.find(
        msg => lovePercent >= msg.range[0] && lovePercent <= msg.range[1]
      ).text;

      const message = `💘 *Love Compatibility Test* 💘\n\n❤️ @${user1.split("@")[0]} + @${user2.split("@")[0]} = *${lovePercent}%*\n${loveMessage}`;

      // React ❤️
      await conn.sendMessage(from, { react: { text: "❤️", key: mek.key } });

      // Send result with contextInfo
      await conn.sendMessage(from, {
        text: message,
        mentions: [user1, user2],
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia  ",
            serverMessageId: 200
          }
        }
      }, { quoted: mek });

    } catch (e) {
      console.error("❌ Error in lovetest.js:", e);
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("⚠️ Failed to run love test.");
    }
  },
};

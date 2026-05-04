let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "question",
  desc: "Get a random question",
  category: "fun",
  react: "❓",
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

      const response = await fetchFn("https://apiskeith.top/fun/question");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch question.");
      const data = await response.json();

      const questionText = data?.result || data?.question || null;
      if (!questionText) return await sendMessageWithContext("⚠️ No question found.");

      await sendMessageWithContext(`❓ *RANDOM QUESTION*\n━━━━━━━━━━━━━━━━━━━━\n\n${questionText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);

    } catch (err) {
      console.error("Error in question.js:", err);
      await sendMessageWithContext("⚠️ Error fetching question. Try again later.");
    }
  },
};
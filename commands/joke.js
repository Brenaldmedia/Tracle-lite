let fetchFn;
try {
  fetchFn = global.fetch || require("node-fetch");
} catch {
  fetchFn = global.fetch;
}

module.exports = {
  pattern: "joke",
  desc: "Get a random joke",
  category: "fun",
  react: "😂",
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

      const response = await fetchFn("https://apiskeith.top/fun/joke");
      if (!response.ok) return await sendMessageWithContext("⚠️ Failed to fetch joke.");
      const data = await response.json();

      let jokeText = data?.result || data?.joke || null;
      if (!jokeText) return await sendMessageWithContext("⚠️ No joke found.");

      if (typeof jokeText === 'object') {
        jokeText = jokeText.setup ? `${jokeText.setup}\n\n${jokeText.punchline}` : JSON.stringify(jokeText);
      }

      await sendMessageWithContext(`😂 *JOKE*\n━━━━━━━━━━━━━━━━━━━━\n\n${jokeText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`);

    } catch (err) {
      console.error("Error in joke.js:", err);
      await sendMessageWithContext("⚠️ Error fetching joke. Try again later.");
    }
  },
};
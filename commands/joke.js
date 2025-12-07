// === joke.js ===
const axios = require("axios");

module.exports = {
  pattern: "joke",
  desc: "Get a random joke 😂",
  category: "fun",
  react: "😂",
  filename: __filename,
  use: ".joke",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const url = "https://api.giftedtech.co.ke/api/fun/jokes?apikey=gifted";
      const { data } = await axios.get(url);

      if (!data.success || !data.result) {
        return reply("⚠️ Failed to fetch a joke. Try again later.");
      }

      const joke = `😂 *Joke:*\n\n${data.result.setup}\n\n👉 ${data.result.punchline}`;
      await conn.sendMessage(from, { text: joke }, { quoted: mek });

    } catch (e) {
      console.error("[joke.js]", e.message);
      reply("⚠️ Error fetching joke.");
    }
  },
};

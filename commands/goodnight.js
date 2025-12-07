// === goodnight.js ===
const axios = require("axios");

module.exports = {
  pattern: "goodnight",
  desc: "Get a Goodnight message 🌙",
  category: "fun",
  react: "🌙",
  filename: __filename,
  use: ".goodnight",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/fun/goodnight?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch goodnight message.");
      await conn.sendMessage(from, { text: `🌙 *Goodnight:* \n\n${data.result}` }, { quoted: mek });
    } catch (e) {
      console.error("[goodnight.js]", e.message);
      reply("⚠️ Error fetching goodnight message.");
    }
  },
};

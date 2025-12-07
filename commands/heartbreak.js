// === heartbreak.js ===
const axios = require("axios");

module.exports = {
  pattern: "heartbreak",
  desc: "Get a heartbreak message 💔",
  category: "fun",
  react: "💔",
  filename: __filename,
  use: ".heartbreak",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/fun/heartbreak?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch heartbreak message.");
      await conn.sendMessage(from, { text: `💔 *Heartbreak:* \n\n${data.result}` }, { quoted: mek });
    } catch (e) {
      console.error("[heartbreak.js]", e.message);
      reply("⚠️ Error fetching heartbreak message.");
    }
  },
};

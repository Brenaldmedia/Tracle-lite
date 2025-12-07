// === love.js ===
const axios = require("axios");

module.exports = {
  pattern: "love",
  desc: "Get a love message 💕",
  category: "fun",
  react: "💕",
  filename: __filename,
  use: ".love",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/fun/love?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch love message.");
      await conn.sendMessage(from, { text: `💕 *Love:* \n\n${data.result}` }, { quoted: mek });
    } catch (e) {
      console.error("[love.js]", e.message);
      reply("⚠️ Error fetching love message.");
    }
  },
};

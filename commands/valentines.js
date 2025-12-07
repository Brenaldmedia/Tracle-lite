// === valentines.js ===
const axios = require("axios");

module.exports = {
  pattern: "valentines",
  desc: "Get a Valentines message ❤️",
  category: "fun",
  react: "❤️",
  filename: __filename,
  use: ".valentines",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/fun/valentines?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch Valentines message.");
      await conn.sendMessage(from, { text: `❤️ *Valentines:* \n\n${data.result}` }, { quoted: mek });
    } catch (e) {
      console.error("[valentines.js]", e.message);
      reply("⚠️ Error fetching Valentines.");
    }
  },
};

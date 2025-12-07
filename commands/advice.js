// === advice.js ===
const axios = require("axios");

module.exports = {
  pattern: "advice",
  desc: "Get random advice 💡",
  category: "fun",
  react: "💡",
  filename: __filename,
  use: ".advice",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/fun/advice?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch advice.");
      await conn.sendMessage(from, { text: `💡 *Advice:* \n\n${data.result}` }, { quoted: mek });
    } catch (e) {
      console.error("[advice.js]", e.message);
      reply("⚠️ Error fetching advice.");
    }
  },
};

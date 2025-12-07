// === thankyou.js ===
const axios = require("axios");

module.exports = {
  pattern: "thankyou",
  desc: "Get a Thank You message 🙏",
  category: "fun",
  react: "🙏",
  filename: __filename,
  use: ".thankyou",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/fun/thankyou?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch thank you message.");
      await conn.sendMessage(from, { text: `🙏 *Thank You:* \n\n${data.result}` }, { quoted: mek });
    } catch (e) {
      console.error("[thankyou.js]", e.message);
      reply("⚠️ Error fetching thank you message.");
    }
  },
};

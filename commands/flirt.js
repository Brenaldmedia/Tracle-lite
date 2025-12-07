// === flirt.js ===
const axios = require("axios");

module.exports = {
  pattern: "flirt",
  desc: "Get a flirty line 😘",
  category: "fun",
  react: "😘",
  filename: __filename,
  use: ".flirt",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const url = "https://api.giftedtech.co.ke/api/fun/flirt?apikey=gifted";
      const { data } = await axios.get(url);

      if (!data.success || !data.result) {
        return reply("⚠️ Failed to fetch a flirt line. Try again later.");
      }

      const flirt = `😘 *Flirt:* \n\n${data.result}`;
      await conn.sendMessage(from, { text: flirt }, { quoted: mek });

    } catch (e) {
      console.error("[flirt.js]", e.message);
      reply("⚠️ Error fetching flirt line.");
    }
  },
};

// === awoo.js ===
const axios = require("axios");

module.exports = {
  pattern: "awoo",
  desc: "Get a random anime awoo 🐺",
  category: "anime",
  react: "🐺",
  filename: __filename,
  use: ".awoo",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/awoo?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch awoo image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "🐺 *Here’s your awoo!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[awoo.js]", e.message);
      reply("⚠️ Error fetching awoo image.");
    }
  },
};

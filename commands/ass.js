// === ass.js ===
const axios = require("axios");

module.exports = {
  pattern: "ass",
  desc: "Get a random anime ass 🍑",
  category: "anime",
  react: "🍑",
  filename: __filename,
  use: ".ass",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/ass?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch ass image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "🍑 *Here’s some anime ass!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[ass.js]", e.message);
      reply("⚠️ Error fetching ass image.");
    }
  },
};

// === loli.js ===
const axios = require("axios");

module.exports = {
  pattern: "loli",
  desc: "Get a random anime loli 🧸",
  category: "anime",
  react: "🧸",
  filename: __filename,
  use: ".loli",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/loli?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch loli image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "🧸 *Here’s your loli!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[loli.js]", e.message);
      reply("⚠️ Error fetching loli image.");
    }
  },
};

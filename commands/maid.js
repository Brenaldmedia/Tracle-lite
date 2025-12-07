// === maid.js ===
const axios = require("axios");

module.exports = {
  pattern: "maid",
  desc: "Get a random anime maid 🧹",
  category: "anime",
  react: "🧹",
  filename: __filename,
  use: ".maid",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/maid?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch maid image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "🧹 *Here’s your maid!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[maid.js]", e.message);
      reply("⚠️ Error fetching maid image.");
    }
  },
};

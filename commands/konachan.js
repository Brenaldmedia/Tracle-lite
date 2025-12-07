// === konachan.js ===
const axios = require("axios");

module.exports = {
  pattern: "konachan",
  desc: "Get a random Konachan anime image 🌸",
  category: "anime",
  react: "🌸",
  filename: __filename,
  use: ".konachan",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/konachan?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch konachan image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "🌸 *Here’s a Konachan pic!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[konachan.js]", e.message);
      reply("⚠️ Error fetching konachan image.");
    }
  },
};

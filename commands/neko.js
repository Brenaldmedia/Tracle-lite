// === neko.js ===
const axios = require("axios");

module.exports = {
  pattern: "neko",
  desc: "Get a random anime neko 🐱",
  category: "anime",
  react: "🐱",
  filename: __filename,
  use: ".neko",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/neko?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch neko image.");

      const imageUrl = data.result;
      await conn.sendMessage(
        from,
        {
          image: { url: imageUrl },
          caption: "🐱 *Here’s your neko!*",
        },
        { quoted: mek }
      );

    } catch (e) {
      console.error("[neko.js]", e.message);
      reply("⚠️ Error fetching neko image.");
    }
  },
};

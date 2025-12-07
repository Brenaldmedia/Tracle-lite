// === waifu.js ===
const axios = require("axios");

module.exports = {
  pattern: "waifu",
  desc: "Get a random anime waifu 💖",
  category: "anime",
  react: "💖",
  filename: __filename,
  use: ".waifu",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/waifu?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch waifu image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "💖 *Here’s your waifu!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[waifu.js]", e.message);
      reply("⚠️ Error fetching waifu image.");
    }
  },
};

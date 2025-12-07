// === hwaifu.js ===
const axios = require("axios");

module.exports = {
  pattern: "hwaifu",
  desc: "Get a random hentai waifu 🔞",
  category: "anime",
  react: "🔥",
  filename: __filename,
  use: ".hwaifu",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/hwaifu?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch hwaifu image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "🔥 *Here’s your hentai waifu!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[hwaifu.js]", e.message);
      reply("⚠️ Error fetching hwaifu image.");
    }
  },
};

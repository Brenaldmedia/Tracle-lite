// === hneko.js ===
const axios = require("axios");

module.exports = {
  pattern: "hneko",
  desc: "Get a random hentai neko 🐱🔥",
  category: "anime",
  react: "😼",
  filename: __filename,
  use: ".hneko",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/hneko?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch hneko image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "😼 *Here’s your hentai neko!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[hneko.js]", e.message);
      reply("⚠️ Error fetching hneko image.");
    }
  },
};

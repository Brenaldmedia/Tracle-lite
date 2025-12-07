// === ero.js ===
const axios = require("axios");

module.exports = {
  pattern: "ero",
  desc: "Get a random ero anime pic 🔥",
  category: "anime",
  react: "💋",
  filename: __filename,
  use: ".ero",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/ero?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch ero image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "💋 *Here’s an ero pic!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[ero.js]", e.message);
      reply("⚠️ Error fetching ero image.");
    }
  },
};

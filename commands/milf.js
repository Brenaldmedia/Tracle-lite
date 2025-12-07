// === milf.js ===
const axios = require("axios");

module.exports = {
  pattern: "milf",
  desc: "Get a random anime MILF 👩‍🍼",
  category: "anime",
  react: "👩‍🍼",
  filename: __filename,
  use: ".milf",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const { data } = await axios.get("https://api.giftedtech.co.ke/api/anime/milf?apikey=gifted");
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch milf image.");

      const imageUrl = data.result;
      await conn.sendMessage(from, {
        image: { url: imageUrl },
        caption: "👩‍🍼 *Here’s your MILF!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[milf.js]", e.message);
      reply("⚠️ Error fetching milf image.");
    }
  },
};

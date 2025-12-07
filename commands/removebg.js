// === removebg.js ===
const axios = require("axios");

module.exports = {
  pattern: "removebg",
  desc: "Remove background from image 🖼️",
  category: "tools",
  react: "✂️",
  filename: __filename,
  use: ".removebg <image_url>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const url = args[0] || "https://files.giftedtech.web.id/image/mygifted.png";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/removebg?apikey=gifted&url=${encodeURIComponent(url)}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t remove background.");

      await conn.sendMessage(from, {
        image: { url: data.result },
        caption: "✂️ *Background removed!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[removebg.js]", e.message);
      reply("⚠️ Error removing background.");
    }
  },
};

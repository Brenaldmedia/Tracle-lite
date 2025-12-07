// === ttp.js ===
const axios = require("axios");

module.exports = {
  pattern: "ttp",
  desc: "Text-to-picture 🎨",
  category: "tools",
  react: "🎨",
  filename: __filename,
  use: ".ttp <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const query = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/ttp?apikey=gifted&query=${encodeURIComponent(query)}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate TTP image.");

      await conn.sendMessage(from, {
        image: { url: data.result },
        caption: "🎨 *Text-to-picture generated!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[ttp.js]", e.message);
      reply("⚠️ Error generating TTP.");
    }
  },
};

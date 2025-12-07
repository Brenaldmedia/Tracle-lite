// === ssphone.js ===
const axios = require("axios");

module.exports = {
  pattern: "ssphone",
  desc: "Take mobile screenshot 📱",
  category: "tools",
  react: "📱",
  filename: __filename,
  use: ".ssphone <url>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const url = args[0] || "https://portfolio.giftedtech.web.id";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/ssphone?apikey=gifted&url=${encodeURIComponent(url)}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t take screenshot.");

      await conn.sendMessage(from, {
        image: { url: data.result },
        caption: "📱 *Mobile screenshot!*",
      }, { quoted: mek });

    } catch (e) {
      console.error("[ssphone.js]", e.message);
      reply("⚠️ Error taking screenshot.");
    }
  },
};

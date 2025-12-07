// === gradienttext.js ===
const axios = require("axios");

module.exports = {
  pattern: "gradienttext",
  desc: "Make gradient style text 🌈",
  category: "ephoto360",
  react: "🌈",
  filename: __filename,
  use: ".gradienttext <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ephoto360/gradienttext?apikey=gifted&text=${encodeURIComponent(text)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate gradient text.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `🌈 *Gradient Text*\n> ${text}` }, { quoted: mek });

    } catch (e) {
      console.error("[gradienttext.js]", e.message);
      reply("⚠️ Error generating gradient text.");
    }
  },
};

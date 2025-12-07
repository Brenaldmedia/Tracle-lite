// === cartoonstyle.js ===
const axios = require("axios");

module.exports = {
  pattern: "cartoonstyle",
  desc: "Make cartoon style text 🎨",
  category: "ephoto360",
  react: "🎨",
  filename: __filename,
  use: ".cartoonstyle <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ephoto360/cartoonstyle?apikey=gifted&text=${encodeURIComponent(text)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate cartoon style text.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `🎨 *Cartoon Style*\n> ${text}` }, { quoted: mek });

    } catch (e) {
      console.error("[cartoonstyle.js]", e.message);
      reply("⚠️ Error generating cartoon style.");
    }
  },
};

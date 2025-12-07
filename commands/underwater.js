// === underwater.js ===
const axios = require("axios");

module.exports = {
  pattern: "underwater",
  desc: "Make underwater text 🌊",
  category: "ephoto360",
  react: "🌊",
  filename: __filename,
  use: ".underwater <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ephoto360/underwater?apikey=gifted&text=${encodeURIComponent(text)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate underwater text.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `🌊 *Underwater Text*\n> ${text}` }, { quoted: mek });

    } catch (e) {
      console.error("[underwater.js]", e.message);
      reply("⚠️ Error generating underwater text.");
    }
  },
};

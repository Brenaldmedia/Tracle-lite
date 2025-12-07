// === luxury.js ===
const axios = require("axios");

module.exports = {
  pattern: "luxury",
  desc: "Make Luxury Gold text ✨👑",
  category: "ephoto360",
  react: "👑",
  filename: __filename,
  use: ".luxury <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ephoto360/luxurygold?apikey=gifted&text=${encodeURIComponent(text)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate luxury gold text.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `👑 *Luxury Gold Style*\n> ${text}` }, { quoted: mek });

    } catch (e) {
      console.error("[luxury.js]", e.message);
      reply("⚠️ Error generating luxury gold text.");
    }
  },
};

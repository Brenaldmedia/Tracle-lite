// === glowingtext.js ===
const axios = require("axios");

module.exports = {
  pattern: "glowingtext",
  desc: "Make glowing text ✨",
  category: "ephoto360",
  react: "✨",
  filename: __filename,
  use: ".glowingtext <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ephoto360/glowingtext?apikey=gifted&text=${encodeURIComponent(text)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate glowing text.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `✨ *Glowing Text*\n> ${text}` }, { quoted: mek });

    } catch (e) {
      console.error("[glowingtext.js]", e.message);
      reply("⚠️ Error generating glowing text.");
    }
  },
};

// === deletingtext.js ===
const axios = require("axios");

module.exports = {
  pattern: "deletingtext",
  desc: "Make Deleting Text style 🗑️",
  category: "ephoto360",
  react: "🗑️",
  filename: __filename,
  use: ".deletingtext <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ephoto360/deletingtext?apikey=gifted&text=${encodeURIComponent(text)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate Deleting Text style.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `🗑️ *Deleting Text*\n> ${text}` }, { quoted: mek });

    } catch (e) {
      console.error("[deletingtext.js]", e.message);
      reply("⚠️ Error generating Deleting Text.");
    }
  },
};

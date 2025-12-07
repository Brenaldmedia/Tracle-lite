// === americanflag.js ===
const axios = require("axios");

module.exports = {
  pattern: "americanflag",
  desc: "Make American Flag style text 🇺🇸",
  category: "ephoto360",
  react: "🇺🇸",
  filename: __filename,
  use: ".americanflag <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ephoto360/americanflag?apikey=gifted&text=${encodeURIComponent(text)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate American Flag text.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `🇺🇸 *American Flag Style*\n> ${text}` }, { quoted: mek });

    } catch (e) {
      console.error("[americanflag.js]", e.message);
      reply("⚠️ Error generating American Flag text.");
    }
  },
};

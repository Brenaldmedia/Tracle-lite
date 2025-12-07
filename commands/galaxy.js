// === galaxy.js ===
const axios = require("axios");

module.exports = {
  pattern: "galaxy",
  desc: "Make Galaxy style text 🌌",
  category: "ephoto360",
  react: "🌌",
  filename: __filename,
  use: ".galaxy <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ephoto360/galaxy?apikey=gifted&text=${encodeURIComponent(text)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate galaxy style text.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `🌌 *Galaxy Text*\n> ${text}` }, { quoted: mek });

    } catch (e) {
      console.error("[galaxy.js]", e.message);
      reply("⚠️ Error generating galaxy text.");
    }
  },
};

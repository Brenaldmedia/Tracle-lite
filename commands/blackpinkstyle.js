// === blackpinkstyle.js ===
const axios = require("axios");

module.exports = {
  pattern: "blackpink",
  desc: "Make BlackPink Style text 💖",
  category: "ephoto360",
  react: "💖",
  filename: __filename,
  use: ".blackpink <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ephoto360/blackpinkstyle?apikey=gifted&text=${encodeURIComponent(text)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate BlackPink style.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `💖 *BlackPink Style*\n> ${text}` }, { quoted: mek });

    } catch (e) {
      console.error("[blackpink.js]", e.message);
      reply("⚠️ Error generating BlackPink style.");
    }
  },
};

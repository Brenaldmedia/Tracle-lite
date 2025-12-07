// === deepimg.js ===
const axios = require("axios");

module.exports = {
  pattern: "deepimg",
  desc: "Generate Deep AI image 🤖",
  category: "ai",
  react: "🤖",
  filename: __filename,
  use: ".deepimg <prompt>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const prompt = args.join(" ") || "A handsome gentle man";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ai/deepimg?apikey=gifted&prompt=${encodeURIComponent(prompt)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate Deep AI image.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `🤖 *Deep Image*\n> ${prompt}` }, { quoted: mek });

    } catch (e) {
      console.error("[deepimg.js]", e.message);
      reply("⚠️ Error generating Deep AI image.");
    }
  },
};

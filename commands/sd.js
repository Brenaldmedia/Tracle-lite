// === sd.js ===
const axios = require("axios");

module.exports = {
  pattern: "sd",
  desc: "Generate Stable Diffusion image 🌿",
  category: "ai",
  react: "🌿",
  filename: __filename,
  use: ".sd <prompt>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const prompt = args.join(" ") || "Tall Green Grass";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ai/sd?apikey=gifted&prompt=${encodeURIComponent(prompt)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t generate SD image.");
      await conn.sendMessage(from, { image: { url: data.result }, caption: `🌿 *Stable Diffusion*\n> ${prompt}` }, { quoted: mek });

    } catch (e) {
      console.error("[sd.js]", e.message);
      reply("⚠️ Error generating SD image.");
    }
  },
};

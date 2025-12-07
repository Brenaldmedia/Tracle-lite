// === fluximg.js ===
const axios = require("axios");

module.exports = {
  pattern: "fluximg",
  desc: "Generate Flux image 🎇",
  category: "ai",
  react: "🎇",
  filename: __filename,
  use: ".fluximg <prompt>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const prompt = args.join(" ") || "A handsome gentleman";

      await reply("> ⏳ Generating Flux image...");

      const { data } = await axios.get(
        `https://api.giftedtech.co.ke/api/ai/fluximg?apikey=gifted&prompt=${encodeURIComponent(prompt)}`
      );

      // Check response validity
      if (!data || !data.success || !data.result) {
        console.error("[fluximg.js] Invalid API response:", data);
        return reply(`⚠️ Couldn’t generate flux image.\n\n📝 Response: ${JSON.stringify(data)}`);
      }

      // Send image
      await conn.sendMessage(
        from,
        { image: { url: data.result }, caption: `🎇 *Flux Image Generated*\n\n✨ Prompt: *${prompt}*` },
        { quoted: mek }
      );

    } catch (e) {
      console.error("[fluximg.js]", e);

      let errMsg = "⚠️ Error generating flux image.";
      if (e.response?.data) {
        errMsg += `\n\n📝 API Response: ${JSON.stringify(e.response.data)}`;
      } else if (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND") {
        errMsg += "\n\n🌐 Connection error. API might be down.";
      } else {
        errMsg += `\n\nError: ${e.message}`;
      }

      reply(errMsg);
    }
  },
};

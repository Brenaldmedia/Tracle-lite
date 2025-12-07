// === glossysilver.js ===
const axios = require("axios");

module.exports = {
  pattern: "glossysilver",
  desc: "⚪ Generate Glossy Silver text logo",
  category: "logo",
  filename: __filename,
  use: ".glossysilver <text>",

  execute: async (conn, mek, m, { from, args, reply }) => {
    try {
      const text = args.join(" ");
      if (!text) {
        return reply("❎ Please provide text for the logo.\n\n📌 Example:\n`.glossysilver Brenald Media`");
      }

      // React to the command with ⚪
      await conn.sendMessage(from, {
        react: { text: "⚪", key: mek.key }
      });

      await reply("✨ Generating logo... Please wait.");

      // Call API
      const url = `https://api.princetechn.com/api/ephoto360/glossysilver?apikey=prince&text=${encodeURIComponent(text)}`;
      const { data } = await axios.get(url);

      if (!data || !data.result?.image_url) {
        return reply("⚠️ Failed to generate logo.");
      }

      // Send image
      await conn.sendMessage(
        from,
        { image: { url: data.result.image_url }, caption: `✅ Generated Glossy Silver Logo for *${text}*` },
        { quoted: mek }
      );

    } catch (e) {
      console.error("[GlossySilver] Error:", e.message);
      reply(`⚠️ Error: ${e.message}`);
    }
  }
};

// === readqr.js ===
const axios = require("axios");

module.exports = {
  pattern: "readqr",
  desc: "Read a QR code 🔎",
  category: "tools",
  react: "🔎",
  filename: __filename,
  use: ".readqr <image_url>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const url = args[0] || "https://files.giftedtech.web.id/image/qrtest.png";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/readqr?apikey=gifted&url=${encodeURIComponent(url)}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t read QR code.");

      reply("🔎 *QR Result:*\n" + "```" + data.result + "```");

    } catch (e) {
      console.error("[readqr.js]", e.message);
      reply("⚠️ Error reading QR code.");
    }
  },
};

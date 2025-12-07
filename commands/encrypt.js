// === encrypt.js ===
const axios = require("axios");

module.exports = {
  pattern: "encrypt",
  desc: "Encrypt code 🔐",
  category: "tools",
  react: "🔐",
  filename: __filename,
  use: ".encrypt <code>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const code = args.join(" ") || 'console.log("Gifted Tech")';
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/encrypt?apikey=gifted&code=${encodeURIComponent(code)}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t encrypt code.");

      reply("🔐 *Encrypted:*\n" + "```" + data.result + "```");

    } catch (e) {
      console.error("[encrypt.js]", e.message);
      reply("⚠️ Error encrypting code.");
    }
  },
};

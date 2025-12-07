// === encryptv2.js ===
const axios = require("axios");

module.exports = {
  pattern: "encryptv2",
  desc: "Encrypt code (v2) 🔒",
  category: "tools",
  react: "🔒",
  filename: __filename,
  use: ".encryptv2 <code>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const code = args.join(" ") || 'console.log("Gifted Tech")';
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/encryptv2?apikey=gifted&code=${encodeURIComponent(code)}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t encrypt code.");

      reply("🔒 *Encrypted v2:*\n" + "```" + data.result + "```");

    } catch (e) {
      console.error("[encryptv2.js]", e.message);
      reply("⚠️ Error encrypting code.");
    }
  },
};

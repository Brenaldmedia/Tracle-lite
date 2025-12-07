// === ebinary.js ===
const axios = require("axios");


module.exports = {
  pattern: "ebinary",
  desc: "Encode text to binary 🧮",
  category: "tools",
  react: "1️⃣",
  filename: __filename,
  use: ".ebinary <text>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const query = args.join(" ") || "Gifted Tech";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/ebinary?apikey=gifted&query=${encodeURIComponent(query)}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t convert to binary.");

      reply("1️⃣ *Binary:*\n" + "```" + data.result + "```");

    } catch (e) {
      console.error("[ebinary.js]", e.message);
      reply("⚠️ Error encoding binary.");
    }
  },
};

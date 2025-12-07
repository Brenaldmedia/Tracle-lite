// === blackbox.js ===
const axios = require("axios");

module.exports = {
  pattern: "blackbox",
  desc: "Ask Blackbox AI 🖤",
  category: "ai",
  react: "🖤",
  filename: __filename,
  use: ".blackbox <question>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const query = args.join(" ") || "Hello AI!";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ai/blackbox?apikey=gifted&q=${encodeURIComponent(query)}`);

      if (!data.success || !data.result) return reply("⚠️ Couldn’t get Blackbox response.");
      await reply(`🖤 *Blackbox AI says:*\n\n${data.result}`);

    } catch (e) {
      console.error("[blackbox.js]", e.message);
      reply("⚠️ Error contacting Blackbox AI.");
    }
  },
};

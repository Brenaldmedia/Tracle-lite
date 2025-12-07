// === whois.js ===
const axios = require("axios");

module.exports = {
  pattern: "whois",
  desc: "Get WHOIS info for a domain 🌐",
  category: "tools",
  react: "🌐",
  filename: __filename,
  use: ".whois <domain>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const domain = args[0] || "gifted.my.id";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/whois?apikey=gifted&domain=${domain}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch WHOIS info.");

      reply("🌐 *WHOIS Result:*\n" + "```" + JSON.stringify(data.result, null, 2) + "```");

    } catch (e) {
      console.error("[whois.js]", e.message);
      reply("⚠️ Error fetching WHOIS info.");
    }
  },
};

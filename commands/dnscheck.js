// === dnscheck.js ===
const axios = require("axios");

module.exports = {
  pattern: "dns",
  desc: "Check DNS records for a domain 🔍",
  category: "tools",
  react: "🔍",
  filename: __filename,
  use: ".dns <domain>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const domain = args[0] || "gifted.my.id";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/dns-check?apikey=gifted&domain=${domain}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch DNS records.");

      reply("🔍 *DNS Result:*\n" + "```" + JSON.stringify(data.result, null, 2) + "```");

    } catch (e) {
      console.error("[dnscheck.js]", e.message);
      reply("⚠️ Error fetching DNS records.");
    }
  },
};

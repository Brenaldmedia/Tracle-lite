// === cfturnstile.js ===
const axios = require("axios");

module.exports = {
  pattern: "cfturnstile",
  desc: "Check Cloudflare Turnstile config 🔑",
  category: "tools",
  react: "🔑",
  filename: __filename,
  use: ".cfturnstile <url> <sitekey>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const url = args[0] || "https://cobalt.3kh0.net";
      const sitekey = args[1] || "0x4AAAAAAAQmBip-ISYOeuhC";
      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tools/cf-turnstile?apikey=gifted&url=${encodeURIComponent(url)}&sitekey=${sitekey}`);
      if (!data.success || !data.result) return reply("⚠️ Couldn’t fetch Turnstile data.");

      reply("🔑 *Turnstile Result:*\n" + "```" + JSON.stringify(data.result, null, 2) + "```");

    } catch (e) {
      console.error("[cfturnstile.js]", e.message);
      reply("⚠️ Error checking Turnstile.");
    }
  },
};

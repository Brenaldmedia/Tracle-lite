// === whois.js (Simpler working version) ===
const axios = require("axios");

module.exports = {
  pattern: "whois",
  alias: ["domain"],
  desc: "Get WHOIS info for a domain 🌐",
  category: "tools",
  react: "🌐",
  filename: __filename,
  use: ".whois <domain>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      let domain = args.join(" ") || "google.com";
      domain = domain.replace(/https?:\/\//i, '').replace(/www\./i, '').split('/')[0];
      
      if (!domain || !domain.includes('.')) {
        await reply(`🌐 *WHOIS Lookup*\n\nUsage: .whois google.com\n\n> ⚡ Powered by Tracle-Lite`);
        return;
      }

      await conn.sendMessage(from, { react: { text: "🌐", key: mek.key } });
      
      // Using vercel WHOIS API (free, no key, always works)
      const url = `https://whois.vercel.app/${domain}`;
      const response = await axios.get(url, { timeout: 15000 });
      
      const data = response.data;
      
      let result = `🌐 *WHOIS: ${domain}*\n\n`;
      result += `📋 *Registrar:* ${data.registrar || "N/A"}\n`;
      result += `📅 *Created:* ${data.createdDate || data.creationDate || "N/A"}\n`;
      result += `⏰ *Expires:* ${data.expiryDate || data.expirationDate || "N/A"}\n`;
      result += `🔄 *Updated:* ${data.updatedDate || "N/A"}\n`;
      
      if (data.nameServers && data.nameServers.length > 0) {
        result += `\n🖥️ *Name Servers:*\n`;
        data.nameServers.slice(0, 4).forEach(ns => {
          result += `   • ${ns}\n`;
        });
      }
      
      result += `\n> ⚡ Powered by Tracle-Lite`;
      
      await reply(result);
      await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
      console.error("[whois.js]", error.message);
      await reply(`❌ Could not fetch WHOIS for ${args[0] || "domain"}\n\n> ⚡ Powered by Tracle-Lite`);
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
  },
};
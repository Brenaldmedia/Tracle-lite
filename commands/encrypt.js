// === encrypt.js ===
module.exports = {
  pattern: "encrypt",
  alias: ["encode"],
  desc: "Encrypt text or code using Base64",
  category: "tools",
  react: "🔐",
  filename: __filename,
  use: ".encrypt <text or code>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const text = args.join(" ");
      
      if (!text) {
        await reply(`🔐 *Encrypt*

Encrypt any text or code using Base64.

📝 *Usage:*
.encrypt <text or code>

📌 *Examples:*
.encrypt Hello World
.encrypt console.log("Hello")
.encrypt function test() { return true; }

> ⚡ Powered by Tracle-Lite`);
        return;
      }

      await conn.sendMessage(from, { react: { text: "🔐", key: mek.key } });
      
      // Convert to Base64 (works for any text including code)
      const encrypted = Buffer.from(text).toString('base64');
      await reply(encrypted);
      
      await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("[encrypt.js]", e.message);
      await reply(`❌ Error encrypting`);
    }
  },
};
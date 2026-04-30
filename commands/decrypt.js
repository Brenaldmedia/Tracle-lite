// === decrypt.js ===
module.exports = {
  pattern: "decrypt",
  alias: ["decode"],
  desc: "Decrypt Base64 encoded text or code",
  category: "tools",
  react: "🔓",
  filename: __filename,
  use: ".decrypt <base64>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const encoded = args.join(" ");
      
      if (!encoded) {
        await reply(`🔓 *Decrypt*

Decrypt Base64 encoded text or code back to original.

📝 *Usage:*
.decrypt <base64>

📌 *Example:*
.decrypt Y29uc29sZS5sb2coIkhlbGxvIik7

> ⚡ Powered by Tracle-Lite`);
        return;
      }

      await conn.sendMessage(from, { react: { text: "🔓", key: mek.key } });
      
      // Decode from Base64
      let decoded;
      try {
        decoded = Buffer.from(encoded, 'base64').toString('utf8');
      } catch (e) {
        await reply(`❌ Invalid Base64`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return;
      }

      if (!decoded) {
        await reply(`❌ Invalid Base64`);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return;
      }

      // Send back the original code/text
      await reply(decoded);
      await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("[decrypt.js]", e.message);
      await reply(`❌ Error decrypting`);
    }
  },
};
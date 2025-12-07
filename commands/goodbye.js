// === goodbye.js ===
module.exports = {
  pattern: "goodbye",
  desc: "Toggle goodbye messages (Owner/Admin only)",
  category: "group",
  react: "🚤",
  use: ".goodbye on/off",
  filename: __filename,

  execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
    try {
      // --- normalize JIDs ---
      const jidToBase = (jid) => String(jid).split("@")[0].split(":")[0];
      const senderBase = jidToBase(sender);
      const botBase = jidToBase(conn?.user?.id || "");

      // --- Owner check (from .env) ---
      let owners = [];
      if (process.env.OWNER_NUMBER) {
        owners = process.env.OWNER_NUMBER.split(",").map(num => num.trim());
      }
      const isOwner = botBase === senderBase || owners.includes(senderBase);

      // --- Admin check (only for groups) ---
      let isAdmin = false;
      if (isGroup) {
        try {
          const metadata = await conn.groupMetadata(from);
          const participant = metadata.participants.find(p => jidToBase(p.id) === senderBase);
          isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
        } catch {
          return reply("❌ Failed to get group information.");
        }
      }

      // --- Permissions ---
      if (!isOwner) {
        if (isGroup) {
          if (!isAdmin) return reply("❌ Only group admins or the owner can toggle this.");
        } else {
          return reply("❌ Only the owner can toggle this in DMs.");
        }
      }

      // --- Toggle logic ---
      if (!q) {
        return reply(
          `⚙️ Usage: \`.goodbye on\` or \`.goodbye off\`\n\n📡 Current status: *${process.env.GOODBYE_ENABLED === "true" ? "ON ✅" : "OFF ❌"}*`
        );
      }

      if (q.toLowerCase() === "on") {
        process.env.GOODBYE_ENABLED = "true";
        await conn.sendMessage(from, { react: { text: "🚤", key: message.key } });
        return reply("✅ Goodbye messages enabled.\n\n📡 Current status: *ON*");
      } else if (q.toLowerCase() === "off") {
        process.env.GOODBYE_ENABLED = "false";
        await conn.sendMessage(from, { react: { text: "🚤", key: message.key } });
        return reply("❌ Goodbye messages disabled.\n\n📡 Current status: *OFF*");
      } else {
        return reply(
          `⚙️ Usage: \`.goodbye on\` or \`.goodbye off\`\n\n📡 Current status: *${process.env.GOODBYE_ENABLED === "true" ? "ON ✅" : "OFF ❌"}*`
        );
      }

    } catch (e) {
      console.error("Goodbye command error:", e);
      await conn.sendMessage(from, { react: { text: "❌", key: message.key } });
      reply("⚠️ Failed to toggle goodbye messages.");
    }
  }
};

// === hidetag.js (Owner & Admin version) ===
module.exports = {
  pattern: "hidetag",
  desc: "Tag all members for any message/media - Owner & Admin only",
  category: "group",
  use: ".hidetag [message] or reply to a message",
  filename: __filename,
  ownerOnly: false, // Set to false since we're checking manually

  execute: async (conn, message, m, { q, reply, from, isGroup, sessionId, isAdmins, isCreator }) => {
    try {
      if (!isGroup) return reply("❌ This command can only be used in groups.");

      // --- Check if user is bot owner OR group admin ---
      const isOwner = require('../server.js').isBotOwner(conn, message, sessionId);
      const isGroupAdmin = isAdmins || isCreator;
      
      if (!isOwner && !isGroupAdmin) {
        return reply("❌ This command is for bot owner and group admins only.");
      }

      // --- fetch group metadata ---
      let metadata;
      try {
        metadata = await conn.groupMetadata(from);
      } catch {
        return reply("❌ Failed to get group information.");
      }

      // --- mentions list ---
      const participants = metadata.participants.map(p => p.id);

      if (!q && !m.quoted) return reply("❌ Provide a message or reply to a message.");

      // React 👀
      await conn.sendMessage(from, { react: { text: "👀", key: message.key } });

      // --- reply case ---
      if (m.quoted) {
        return await conn.sendMessage(
          from,
          { forward: m.quoted.message, mentions: participants },
          { quoted: message }
        );
      }

      // --- text case ---
      if (q) {
        return await conn.sendMessage(
          from,
          { text: q, mentions: participants },
          { quoted: message }
        );
      }

    } catch (e) {
      console.error("Hidetag error:", e);
      try { await conn.sendMessage(from, { react: { text: "❌", key: message.key } }); } catch {}
      reply(`⚠️ Failed to send hidetag.\n\n${e.message}`);
    }
  }
};
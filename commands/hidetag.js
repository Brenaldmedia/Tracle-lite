// === hidetag.js (Owner & Admin version) ===
module.exports = {
  pattern: "hidetag",
  alias: ["tagall", "everyone"],
  desc: "Tag all members for any message/media - Owner & Admin only",
  category: "group",
  use: ".hidetag [message] or reply to a message",
  filename: __filename,
  ownerOnly: false,

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

      if (!q && !m.quoted) {
        return reply(`❌ Provide a message or reply to a message.\n\nExample: .hidetag Click here to join`);
      }

      // React 👀
      await conn.sendMessage(from, { react: { text: "👀", key: message.key } });

      // --- Case 1: User replied to a message (forward it without replying to command) ---
      if (m.quoted) {
        const quotedMsg = m.quoted.message;
        
        return await conn.sendMessage(
          from,
          { 
            forward: quotedMsg,
            mentions: participants
          }
        );
      }

      // --- Case 2: User typed a message (send as new message, not reply) ---
      if (q) {
        return await conn.sendMessage(
          from,
          { 
            text: q,
            mentions: participants
          }
        );
      }

    } catch (e) {
      console.error("Hidetag error:", e);
      try { await conn.sendMessage(from, { react: { text: "❌", key: message.key } }); } catch {}
      reply(`⚠️ Failed to send hidetag.\n\n${e.message}`);
    }
  }
};
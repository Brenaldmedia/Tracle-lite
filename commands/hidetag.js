// === hidetag.js ===
module.exports = {
  pattern: "hidetag",
  desc: "Tag all members for any message/media - everyone can use",
  category: "group",
  use: ".hidetag [message] or reply to a message",
  filename: __filename,

  execute: async (conn, message, m, { q, reply, from, isGroup }) => {
    try {
      if (!isGroup) return reply("❌ This command can only be used in groups.");

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

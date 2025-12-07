// === kick.js ===
module.exports = {
  pattern: "kick",
  desc: "Remove a member from the group (Admin/Owner Only)",
  category: "group",
  react: "👢",
  filename: __filename,
  use: ".kick @user",

  execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
    try {
      if (!isGroup) return reply("❌ This command can only be used in groups.");

      let metadata;
      try {
        metadata = await conn.groupMetadata(from);
      } catch {
        return reply("❌ Failed to get group info.");
      }

      // Check if user is admin/owner
      const participant = metadata.participants.find(p => p.id === sender);
      const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
      const isOwner = conn.user.id.split(":")[0] === sender.split("@")[0];

      if (!isAdmin && !isOwner) return reply("❌ Only admins can use this command.");

      const mentioned = m.mentionedJid ? m.mentionedJid[0] : null;
      if (!mentioned) return reply("❌ Mention a user to kick.");

      // Send reaction first
      await conn.sendMessage(from, {
        react: { text: "👢", key: message.key }
      });

      // Kick the mentioned user
      await conn.groupParticipantsUpdate(from, [mentioned], "remove");

      // Confirmation with contextInfo
      await conn.sendMessage(from, {
        text: `👢 Removed @${mentioned.split("@")[0]}`,
        mentions: [mentioned],
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia  ",
            serverMessageId: 200
          }
        }
      }, { quoted: message });

    } catch (e) {
      console.error("Kick error:", e);

      // Error with contextInfo + reaction ❌
      await conn.sendMessage(from, {
        react: { text: "❌", key: message.key }
      });

      await conn.sendMessage(from, {
        text: "⚠️ Failed to kick user.",
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia  ",
            serverMessageId: 143
          }
        }
      }, { quoted: message });
    }
  }
};

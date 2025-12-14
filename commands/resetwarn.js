// === resetwarn.js ===
const warnedUsers = new Map(); // Same Map as in warn.js

module.exports = {
  pattern: "resetwarn",
  alias: ["resetwarnings", "clearwarn"],
  desc: "Reset warnings for a user (Admin/Owner Only)",
  category: "group",
  react: "🔄",
  filename: __filename,
  use: ".resetwarn [reply to user's message] or .resetwarn @user",

  execute: async (conn, message, m, { from, isGroup, reply, sender, groupMetadata, sessionId }) => {
    try {
      if (!isGroup) return reply("❌ This command can only be used in groups.");

      let metadata;
      try {
        metadata = await conn.groupMetadata(from);
      } catch {
        return reply("❌ Failed to get group info.");
      }

      // Check permissions
      const { isBotOwner } = require('../server');
      let isAdmin = false;
      
      if (metadata && metadata.participants) {
        const participant = metadata.participants.find(p => p.id === sender);
        isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
      }

      if (!isAdmin && !isBotOwner(conn, message, sessionId)) {
        return reply("❌ Only group admins or bot owner can use this command.");
      }

      // Get user to reset warnings for
      let userToReset = null;
      
      if (m.mentionedJid && m.mentionedJid.length > 0) {
        userToReset = m.mentionedJid[0];
      } else if (m.quoted && m.quoted.sender) {
        userToReset = m.quoted.sender;
      } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToReset = message.message.extendedTextMessage.contextInfo.participant;
      }

      if (!userToReset) {
        return reply("❌ Please reply to a user's message or mention a user to reset warnings.\n\nExamples:\n• Reply to user's message with \".resetwarn\"\n• Use \".resetwarn @user\"");
      }

      // Check if user exists in group
      const userParticipant = metadata.participants.find(p => p.id === userToReset);
      if (!userParticipant) {
        return reply("❌ User not found in this group.");
      }

      // Send reaction
      try {
        await conn.sendMessage(from, {
          react: { text: "🔄", key: message.key }
        });
      } catch (e) {
        console.log("Failed to send reaction:", e);
      }

      // Reset warnings
      const groupKey = from;
      if (warnedUsers.has(groupKey)) {
        const groupWarnings = warnedUsers.get(groupKey);
        if (groupWarnings.has(userToReset)) {
          groupWarnings.delete(userToReset);
          
          const userName = userToReset.split('@')[0];
          const resetByName = sender.split('@')[0];
          
          await conn.sendMessage(from, {
            text: `🔄 *Warnings Reset*\n\n• User: @${userName}\n• Reset by: @${resetByName}\n• All warnings have been cleared\n• Group: ${metadata.subject}\n• Time: ${new Date().toLocaleTimeString()}`,
            mentions: [userToReset, sender],
            contextInfo: {
              externalAdReply: {
                title: "Warnings Reset",
                body: `@${userName}'s warnings cleared`,
                thumbnailUrl: "https://files.catbox.moe/m3o9wj.jpg",
                sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                mediaType: 1
              }
            }
          }, { quoted: message });
        } else {
          await reply("ℹ️ This user has no warnings to reset.");
        }
      } else {
        await reply("ℹ️ No warnings have been given in this group yet.");
      }

    } catch (e) {
      console.error("Resetwarn error:", e);
      await reply("❌ Failed to reset warnings: " + e.message);
    }
  }
};
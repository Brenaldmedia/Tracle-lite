// === kick.js ===
module.exports = {
  pattern: "kick",
  desc: "Remove a member from the group (Admin/Owner Only) - Reply to a message or mention",
  category: "group",
  react: "👢",
  filename: __filename,
  use: ".kick [reply to user's message] or .kick @user",

  execute: async (conn, message, m, { from, isGroup, reply, sender, groupMetadata, sessionId }) => {
    try {
      if (!isGroup) return reply("❌ This command can only be used in groups.");

      let metadata;
      try {
        metadata = await conn.groupMetadata(from);
      } catch {
        return reply("❌ Failed to get group info.");
      }

      // Get the bot's JID correctly
      const botJid = conn.user?.id;
      if (!botJid) {
        return reply("❌ Bot ID not found.");
      }

      // Extract bot number for owner check
      let botNumber = '';
      if (botJid.includes(':')) {
        botNumber = botJid.split(':')[0];
      } else {
        botNumber = botJid.split('@')[0];
      }
      botNumber = botNumber.replace(/\D/g, '');
      
      // Extract sender number
      const senderNumber = sender.split('@')[0].replace(/\D/g, '');
      
      // Check if sender is owner (bot owner)
      const isOwner = senderNumber === botNumber || senderNumber === sessionId.replace(/\D/g, '');
      
      // Check if sender is group admin
      const participant = metadata.participants.find(p => p.id === sender);
      const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";

      // Allow: Bot owner OR group admin/superadmin
      if (!isOwner && !isAdmin) {
        return reply("❌ Only group admins or bot owner can use this command.");
      }

      // Get user to kick: from mentioned OR from quoted message
      let userToKick = null;
      
      // First try: mentioned user (like .kick @user)
      if (m.mentionedJid && m.mentionedJid.length > 0) {
        userToKick = m.mentionedJid[0];
      }
      // Second try: quoted message sender (reply to user's message with .kick)
      else if (m.quoted && m.quoted.sender) {
        userToKick = m.quoted.sender;
      }
      // Third try: check if there's a quoted message in the message itself
      else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToKick = message.message.extendedTextMessage.contextInfo.participant;
      }

      if (!userToKick) {
        return reply("❌ Please reply to a user's message or mention a user to kick.\n\nExamples:\n• Reply to user's message with \".kick\"\n• Use \".kick @user\"");
      }

      // Check if trying to kick self
      if (userToKick === sender) {
        return reply("❌ You cannot kick yourself.");
      }

      // Check if trying to kick bot
      if (userToKick === botJid) {
        return reply("❌ You cannot kick the bot.");
      }

      // Check if mentioned user is admin (prevent kicking admins)
      const userParticipant = metadata.participants.find(p => p.id === userToKick);
      if (!userParticipant) {
        return reply("❌ User not found in this group.");
      }
      
      if (userParticipant?.admin === "admin" || userParticipant?.admin === "superadmin") {
        return reply("❌ You cannot kick group admins.");
      }

      // Send reaction first
      try {
        await conn.sendMessage(from, {
          react: { text: "👢", key: message.key }
        });
      } catch (e) {
        console.log("Failed to send reaction:", e);
      }

      // Kick the user
      await conn.groupParticipantsUpdate(from, [userToKick], "remove");

      // Success message
      const userName = userToKick.split('@')[0];
      const kickedByName = sender.split('@')[0];
      
      const successMessage = `👢 *User Kicked Successfully!*\n\n• User: @${userName}\n• Kicked by: @${kickedByName}\n• Group: ${metadata.subject}\n• Time: ${new Date().toLocaleTimeString()}\n\n⚠️ The user can be added back by any admin.`;
      
      await conn.sendMessage(from, {
        text: successMessage,
        mentions: [userToKick, sender],
        contextInfo: {
          externalAdReply: {
            title: "👢 Kick Command",
            body: `Kicked @${userName}`,
            thumbnailUrl: "https://files.catbox.moe/zlu6dx.jpg",
            sourceUrl: "https://github.com/Brenaldmedia/Tracle",
            mediaType: 1
          }
        }
      }, { quoted: message });

    } catch (e) {
      console.error("Kick error:", e);

      // Error reaction
      try {
        await conn.sendMessage(from, {
          react: { text: "❌", key: message.key }
        });
      } catch (reactionErr) {
        console.log("Failed to send error reaction:", reactionErr);
      }

      let errorMessage = "⚠️ Failed to kick user.";
      
      if (e.message.includes("not authorized")) {
        errorMessage = "❌ Bot is not an admin in this group. Make bot admin first!";
      } else if (e.message.includes("401")) {
        errorMessage = "❌ You don't have permission to kick members.";
      } else if (e.message.includes("403")) {
        errorMessage = "❌ Bot needs admin permissions to kick members.";
      } else if (e.message.includes("404")) {
        errorMessage = "❌ User not found in this group.";
      }
      
      await conn.sendMessage(from, {
        text: errorMessage,
        contextInfo: {
          externalAdReply: {
            title: "Kick Failed",
            body: errorMessage.substring(0, 20) + "...",
            thumbnailUrl: "https://files.catbox.moe/zlu6dx.jpg",
            sourceUrl: "https://github.com/Brenaldmedia/Tracle",
            mediaType: 1
          }
        }
      }, { quoted: message });
    }
  }
};
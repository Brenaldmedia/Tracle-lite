// === warn.js ===
const warnedUsers = new Map(); // Store warnings per user per group

module.exports = {
  pattern: "warn",
  desc: "Warn a user. After 3 warnings, user gets kicked automatically (Admin/Owner Only)",
  category: "group",
  react: "⚠️",
  filename: __filename,
  use: ".warn [reply to user's message] or .warn @user",

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

      // Get user to warn: from mentioned OR from quoted message
      let userToWarn = null;
      
      // First try: mentioned user (like .warn @user)
      if (m.mentionedJid && m.mentionedJid.length > 0) {
        userToWarn = m.mentionedJid[0];
      }
      // Second try: quoted message sender (reply to user's message with .warn)
      else if (m.quoted && m.quoted.sender) {
        userToWarn = m.quoted.sender;
      }
      // Third try: check if there's a quoted message in the message itself
      else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToWarn = message.message.extendedTextMessage.contextInfo.participant;
      }

      if (!userToWarn) {
        return reply("❌ Please reply to a user's message or mention a user to warn.\n\nExamples:\n• Reply to user's message with \".warn\"\n• Use \".warn @user\"");
      }

      // Check if trying to warn self
      if (userToWarn === sender) {
        return reply("❌ You cannot warn yourself.");
      }

      // Check if trying to warn bot
      if (userToWarn === botJid) {
        return reply("❌ You cannot warn the bot.");
      }

      // Check if mentioned user is admin (prevent warning admins)
      const userParticipant = metadata.participants.find(p => p.id === userToWarn);
      if (!userParticipant) {
        return reply("❌ User not found in this group.");
      }
      
      // Don't allow warning admins
      if (userParticipant?.admin === "admin" || userParticipant?.admin === "superadmin") {
        return reply("❌ You cannot warn group admins.");
      }

      // Send reaction first
      try {
        await conn.sendMessage(from, {
          react: { text: "⚠️", key: message.key }
        });
      } catch (e) {
        console.log("Failed to send reaction:", e);
      }

      // Initialize warnings for this group if not exists
      const groupKey = from;
      if (!warnedUsers.has(groupKey)) {
        warnedUsers.set(groupKey, new Map());
      }
      
      const groupWarnings = warnedUsers.get(groupKey);
      
      // Get current warnings for this user
      const currentWarnings = groupWarnings.get(userToWarn) || 0;
      const newWarnings = currentWarnings + 1;
      
      // Update warnings
      groupWarnings.set(userToWarn, newWarnings);
      
      const userName = userToWarn.split('@')[0];
      const warnedByName = sender.split('@')[0];
      const maxWarnings = 3;
      const warningsLeft = maxWarnings - newWarnings;
      
      let warningMessage = `⚠️ *USER WARNED*\n\n`;
      warningMessage += `• User: @${userName}\n`;
      warningMessage += `• Warned by: @${warnedByName}\n`;
      warningMessage += `• Warning: ${newWarnings}/${maxWarnings}\n`;
      warningMessage += `• Warnings left before kick: ${warningsLeft}\n`;
      warningMessage += `• Group: ${metadata.subject}\n`;
      warningMessage += `• Time: ${new Date().toLocaleTimeString()}\n\n`;
      
      // Check if user should be kicked
      if (newWarnings >= maxWarnings) {
        warningMessage += `🚨 *MAX WARNINGS REACHED!* 🚨\n`;
        warningMessage += `User has received ${maxWarnings} warnings and will be kicked from the group.\n\n`;
        
        // Try to kick the user
        try {
          await conn.groupParticipantsUpdate(from, [userToWarn], "remove");
          warningMessage += `✅ User has been kicked from the group.\n`;
          warningMessage += `⚠️ User can be added back by any admin.`;
          
          // Reset warnings after kicking
          groupWarnings.delete(userToWarn);
        } catch (kickError) {
          console.error("Kick error:", kickError);
          warningMessage += `❌ Failed to kick user: ${kickError.message}\n`;
          warningMessage += `Please kick the user manually.`;
        }
      } else {
        warningMessage += `${warningsLeft === 2 ? '⚠️ 2 warnings left!' : '🚨 1 warning left!'}\n`;
        warningMessage += `Next warning will result in a kick from the group.`;
      }
      
      await conn.sendMessage(from, {
        text: warningMessage,
        mentions: [userToWarn, sender],
        contextInfo: {
          externalAdReply: {
            title: "⚠️ Warning System",
            body: `@${userName} warned (${newWarnings}/${maxWarnings})`,
            thumbnailUrl: "https://files.catbox.moe/zlu6dx.jpg",
            sourceUrl: "https://github.com/Brenaldmedia/Tracle",
            mediaType: 1
          }
        }
      }, { quoted: message });

    } catch (e) {
      console.error("Warn error:", e);

      // Error reaction
      try {
        await conn.sendMessage(from, {
          react: { text: "❌", key: message.key }
        });
      } catch (reactionErr) {
        console.log("Failed to send error reaction:", reactionErr);
      }

      let errorMessage = "⚠️ Failed to warn user.";
      
      if (e.message.includes("not authorized")) {
        errorMessage = "❌ Bot is not an admin in this group. Make bot admin first!";
      } else if (e.message.includes("401")) {
        errorMessage = "❌ You don't have permission to warn members.";
      } else if (e.message.includes("403")) {
        errorMessage = "❌ Bot needs admin permissions to warn members.";
      } else if (e.message.includes("404")) {
        errorMessage = "❌ User not found in this group.";
      }
      
      await conn.sendMessage(from, {
        text: errorMessage,
        contextInfo: {
          externalAdReply: {
            title: "Warning Failed",
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
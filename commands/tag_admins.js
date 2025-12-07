// === tagadmins.js ===
module.exports = {
    pattern: "tagadmins",
    desc: "To Tag all Admins of the Group",
    category: "group",
    use: '.tagadmins [message]',
    filename: __filename,

    execute: async (conn, message, m, { args, q, reply, from, isGroup, groupMetadata }) => {
        try {
            if (!isGroup) {
                return reply("❌ This command can only be used in groups.");
            }

            // Get metadata
            let metadata;
            try {
                metadata = await conn.groupMetadata(from);
            } catch (error) {
                return reply("❌ Failed to get group information.");
            }

            // Collect admins
            const admins = metadata.participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id);
            
            const totalAdmins = admins.length;
            if (totalAdmins === 0) {
                return reply("❌ No admins found in this group.");
            }

            // Emojis
            const emojis = ['👑', '⚡', '🌟', '✨', '🎖️', '💎', '🔱', '🛡️', '🚀', '🏆'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            // Message
            const customMessage = q || "Attention Admins!";
            const groupName = metadata.subject || "Unknown Group";

            let teks = `▢ *Group*: ${groupName}\n`;
            teks += `▢ *Admins*: ${totalAdmins}\n`;
            teks += `▢ *Message*: ${customMessage}\n\n`;
            teks += `┌───⊷ *ADMIN MENTIONS*\n`;

            admins.forEach(adminId => {
                teks += `│${randomEmoji} @${adminId.split('@')[0]}\n`;
            });

            teks += "└──✪ TRACLE - LITE ✪──";

            // Send with channel context
            await conn.sendMessage(from, {
                text: teks,
                mentions: admins,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: 201
                    }
                }
            }, { quoted: message });

        } catch (error) {
            console.error("Tagadmins error:", error);
            reply(`❌ Error: ${error.message}`);
        }
    }
};

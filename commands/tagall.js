// === tagall.js ===
module.exports = {
    pattern: "tagall",
    desc: "To Tag all Members with a formatted list",
    category: "group",
    use: '.tagall [message]',
    filename: __filename,

    execute: async (conn, message, m, { args, q, reply, from, isGroup, groupMetadata, sender }) => {
        try {
            if (!isGroup) {
                return reply("❌ This command can only be used in groups.");
            }

            // Get group metadata
            let metadata;
            try {
                metadata = await conn.groupMetadata(from);
            } catch (error) {
                return reply("❌ Failed to get group information.");
            }

            // Check if user is admin or owner
            const participant = metadata.participants.find(p => p.id === sender);
            const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
            const botNumber = conn.user.id.split(':')[0];
            const senderNumber = sender.split('@')[0];
            const isOwner = botNumber === senderNumber;
            
            if (!isAdmin && !isOwner) {
                return reply("❌ Only group admins or the bot owner can use this command.");
            }

            // Get all members
            const participants = metadata.participants;
            const totalMembers = participants.length;
            
            if (totalMembers === 0) {
                return reply("❌ No members found in this group.");
            }

            // Emojis
            const emojis = ['📢', '🔊', '🌐', '🚀', '🎉', '🔥', '⚡', '👻', '💎', '🏆'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            // Message
            const customMessage = q || "Attention Everyone!";
            const groupName = metadata.subject || "Unknown Group";

            let teks = `▢ *Group*: ${groupName}\n`;
            teks += `▢ *Members*: ${totalMembers}\n`;
            teks += `▢ *Message*: ${customMessage}\n\n`;
            teks += `┌───⊷ *MENTIONS*\n`;

            participants.forEach(mem => {
                if (mem.id) {
                    teks += `│${randomEmoji} @${mem.id.split('@')[0]}\n`;
                }
            });

            teks += "└──✪ TRACLE - LITE ✪──";

            // Send with channel context
            await conn.sendMessage(from, {
                text: teks,
                mentions: participants.map(p => p.id),
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: 200
                    }
                }
            }, { quoted: message });

        } catch (error) {
            console.error("Tagall error:", error);
            reply(`❌ Error: ${error.message}`);
        }
    }
};

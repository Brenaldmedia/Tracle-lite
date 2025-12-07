// === invite.js ===
module.exports = {
    pattern: "invite",
    desc: "Get group invite link",
    category: "group",
    react: "🔗",
    filename: __filename,
    use: ".invite",

    execute: async (conn, mek, m, { from, isGroup, reply }) => {
        try {
            if (!isGroup) {
                return reply("❌ This command can only be used in groups.");
            }

            // React
            if (module.exports.react) {
                await conn.sendMessage(from, {
                    react: { text: module.exports.react, key: mek.key }
                });
            }

            // Try getting invite link
            let code;
            try {
                code = await conn.groupInviteCode(from);
            } catch (err) {
                console.error("Invite error:", err);
                return reply("❌ I must be *admin* in this group to generate an invite link.");
            }

            const metadata = await conn.groupMetadata(from);
            const link = `https://chat.whatsapp.com/${code}`;

            const message = `🔗 *Group Invite Link*\n\n📌 ${metadata.subject}\n\n${link}`;

            await conn.sendMessage(from, {
                text: message,
                contextInfo: {
                    externalAdReply: {
                        title: "Group Invite",
                        body: metadata.subject,
                        thumbnailUrl: "https://files.catbox.moe/m3o9wj.jpg",
                        sourceUrl: link,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: mek });

        } catch (e) {
            console.error("❌ Invite command error:", e);
            reply("⚠️ Failed to get invite link. Make sure I’m an *admin*.");
        }
    }
};

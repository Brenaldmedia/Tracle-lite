// commands/choose.js
module.exports = {
    pattern: "choose",
    desc: "Randomly chooses one mentioned user.",
    react: "🎲",
    category: "fun",
    filename: __filename,
    execute: async (conn, mek, m, { from, isGroup, reply }) => {
        try {
            if (!isGroup) {
                return reply("❌ This command can only be used in groups.");
            }

            // React to the command
            if (module.exports.react) {
                await conn.sendMessage(from, {
                    react: { text: module.exports.react, key: mek.key }
                });
            }

            const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

            if (mentioned.length < 2) {
                return reply("❌ Tag at least 2 users to choose from!\n\nExample:\n.choose @user1 @user2");
            }

            const randomPick = mentioned[Math.floor(Math.random() * mentioned.length)];
            const message = `🎲 I  choose... @${randomPick.split("@")[0]} 🎉`;

            await conn.sendMessage(from, {
                text: message,
                mentions: mentioned
            }, { quoted: mek });

        } catch (error) {
            console.error("❌ Error in choose command:", error);
            reply("⚠️ An error occurred while processing the command. Please try again.");
        }
    }
};

module.exports = {
    pattern: "ping",
    name: "ping",
    description: "Check bot response speed",
    tags: ["utility"],
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const start = Date.now();
            const pingMsg = await reply(`🏓 Pong! Checking speed...`);
            const end = Date.now();
            
            const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
            const textEmojis = ['💎', '🏆', '⚡', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡', '✨'];

            const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
            let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

            while (textEmoji === reactionEmoji) {
                textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
            }

            await conn.sendMessage(from, { 
                react: { text: textEmoji, key: message.key } 
            });

            const responseTime = (end - start) / 1000;
            const userSettings = require('../server').getUserSettings(sessionId);
            const { BOT_NAME, OWNER_NAME, MENU_IMAGE_URL, REPO_LINK, PREFIX } = require('../server');

            const details = `⚡ ${userSettings.botName || BOT_NAME} SPEED CHECK ⚡
            
⏱ Response Time: ${responseTime.toFixed(2)}s ${reactionEmoji}
👤 Owner: *${userSettings.ownerName || OWNER_NAME}*`;

            await reply(details, {
                contextInfo: {
                    externalAdReply: {
                        title: "⚡ Tracle Speed Test",
                        body: `${userSettings.botName || BOT_NAME} Performance Check`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        } catch (error) {
            console.error("Error in ping command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
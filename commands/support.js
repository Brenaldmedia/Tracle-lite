module.exports = {
    pattern: "support",
    name: "support",
    description: "Show support information",
    tags: ["support"],
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { generateSupportMessage } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            
            const supportMessage = generateSupportMessage(userSettings);
            
            await reply(supportMessage, {
                contextInfo: {
                    externalAdReply: {
                        title: "💝 Support TRACLE - LITE",
                        body: "Help keep features free for everyone",
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        } catch (error) {
            console.error("Error in support command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
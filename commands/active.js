module.exports = {
    pattern: "active",
    name: "active",
    description: "Show active users",
    tags: ["stats"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { activeConnections } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            
            const activeUsers = Array.from(activeConnections.keys());
            const formattedList = activeUsers.join(' / ');
            
            await reply(`📋 *ACTIVE USERS*\n\n${formattedList}\n\nTotal: ${activeUsers.length} users connected`, {
                contextInfo: {
                    externalAdReply: {
                        title: "📊 Active Users",
                        body: `${activeUsers.length} users currently connected`,
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in active command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
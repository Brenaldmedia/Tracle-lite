module.exports = {
    pattern: "menu",
    name: "menu",
    description: "Show bot menu",
    tags: ["utility"],
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { generateMenu, PREFIX, userPrefixes } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            const menu = generateMenu(userPrefix, sessionId, userSettings);
            
            await reply(menu, {
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: 200
                    },
                    externalAdReply: {
                        title: "📃  Command Menu",
                        body: `${userSettings.botName || BOT_NAME} - All Available Commands`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        } catch (error) {
            console.error("Error in menu command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
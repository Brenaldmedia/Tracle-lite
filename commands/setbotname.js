module.exports = {
    pattern: "setbotname",
    name: "setbotname",
    description: "Set bot name",
    tags: ["customization"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings, BOT_NAME } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                await reply(`🤖 *SET BOT NAME*\n\nUsage:\n• ${userPrefix}setbotname [new bot name]\n\nExample: ${userPrefix}setbotname MyBot\n\nCurrent: ${userSettings.botName || BOT_NAME}`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "🤖 Set Bot Name",
                            body: "Change bot display name",
                            thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                            sourceUrl: require('../server').REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const newBotName = args.join(' ');
            updateUserSettings(sessionId, { botName: newBotName });
            
            await reply(`✅ Bot name updated to: *${newBotName}*`, {
                contextInfo: {
                    externalAdReply: {
                        title: "🤖 Bot Name Updated",
                        body: `Set to: ${newBotName}`,
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in setbotname command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
module.exports = {
    pattern: "setprefix",
    name: "setprefix",
    description: "Set bot prefix",
    tags: ["settings"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                await reply(`📌 *SET PREFIX*\n\nUsage:\n• ${userPrefix}setprefix [new prefix]\n\nExample: ${userPrefix}setprefix !\n${userPrefix}setprefix 😂\n\nCurrent: ${userPrefix}`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "📌 Set Prefix",
                            body: "Change bot prefix",
                            thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                            sourceUrl: require('../server').REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const newPrefix = args[0];
            userPrefixes.set(sessionId, newPrefix);
            
            await reply(`✅ Prefix updated to: ${newPrefix}`, {
                contextInfo: {
                    externalAdReply: {
                        title: "📌 Prefix Updated",
                        body: `Set to: ${newPrefix}`,
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in setprefix command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
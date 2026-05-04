module.exports = {
    pattern: "setname",
    name: "setname",
    description: "Set owner name",
    tags: ["settings"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                await reply(`👤 *SET OWNER NAME*\n\nUsage:\n• ${userPrefix}setname [new name]\n\nExample: ${userPrefix}setname Mark\n\nCurrent: ${userSettings.ownerName || require('../server').OWNER_NAME}`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "👤 Set Owner Name",
                            body: "Change your display name",
                            thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                            sourceUrl: require('../server').REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const newName = args.join(' ');
            updateUserSettings(sessionId, { ownerName: newName });
            
            await reply(`✅ Owner name updated to: *${newName}*`, {
                contextInfo: {
                    externalAdReply: {
                        title: "👤 Name Updated",
                        body: `Set to: ${newName}`,
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in setname command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
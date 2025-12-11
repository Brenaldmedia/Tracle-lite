module.exports = {
    pattern: "autolikestatus",
    name: "autolikestatus",
    description: "Auto like status settings",
    tags: ["settings"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                const status = userSettings.autoLikeStatus === "true" ? "✅ Enabled" : "❌ Disabled";
                await reply(`❤️ *AUTO LIKE STATUS*\n\nCurrent Status: ${status}\n\nUsage:\n• ${userPrefix}autolikestatus on - Enable auto like\n• ${userPrefix}autolikestatus off - Disable auto like`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "❤️ Auto Like Status",
                            body: `Status: ${status}`,
                            thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                            sourceUrl: require('../server').REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const likeStatus = args[0].toLowerCase();
            if (likeStatus === 'on' || likeStatus === 'enable' || likeStatus === 'true') {
                updateUserSettings(sessionId, { autoLikeStatus: "true" });
                await reply(`✅ Auto like status enabled`);
            } else if (likeStatus === 'off' || likeStatus === 'disable' || likeStatus === 'false') {
                updateUserSettings(sessionId, { autoLikeStatus: "false" });
                await reply(`❌ Auto like status disabled`);
            } else {
                await reply(`❌ Invalid option. Use 'on' or 'off'`);
            }
        } catch (error) {
            console.error("Error in autolikestatus command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
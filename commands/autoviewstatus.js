module.exports = {
    pattern: "autoviewstatus",
    name: "autoviewstatus",
    description: "Auto view status settings",
    tags: ["settings"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                const status = userSettings.autoViewStatus === "true" ? "✅ Enabled" : "❌ Disabled";
                await reply(`👀 *AUTO VIEW STATUS*\n\nCurrent Status: ${status}\n\nUsage:\n• ${userPrefix}autoviewstatus on - Enable auto view\n• ${userPrefix}autoviewstatus off - Disable auto view`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "👀 Auto View Status",
                            body: `Status: ${status}`,
                            thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                            sourceUrl: require('../server').REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const viewStatus = args[0].toLowerCase();
            if (viewStatus === 'on' || viewStatus === 'enable' || viewStatus === 'true') {
                updateUserSettings(sessionId, { autoViewStatus: "true" });
                await reply(`✅ Auto view status enabled`);
            } else if (viewStatus === 'off' || viewStatus === 'disable' || viewStatus === 'false') {
                updateUserSettings(sessionId, { autoViewStatus: "false" });
                await reply(`❌ Auto view status disabled`);
            } else {
                await reply(`❌ Invalid option. Use 'on' or 'off'`);
            }
        } catch (error) {
            console.error("Error in autoviewstatus command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
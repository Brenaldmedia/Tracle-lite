module.exports = {
    pattern: "antidelete",
    name: "antidelete",
    description: "Anti-delete settings",
    tags: ["security"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                const status = userSettings.antiDelete === "true" ? "✅ Enabled" : "❌ Disabled";
                const mode = userSettings.antiDeleteMode === "dm" ? "📨 DM" : "💬 Chat";
                
                await reply(`🗑️ *ANTI-DELETE SYSTEM*\n\nCurrent Status: ${status}\nMode: ${mode}\n\nUsage:\n• ${userPrefix}antidelete on - Enable anti-delete\n• ${userPrefix}antidelete off - Disable anti-delete\n• ${userPrefix}antidelete dm - Send to DM\n• ${userPrefix}antidelete all - Send to original chat\n\nWhen enabled, deleted messages will be captured and restored.`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "🗑️ Anti-Delete System",
                            body: `Status: ${status}`,
                            thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                            sourceUrl: require('../server').REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const antiDeleteAction = args[0].toLowerCase();
            if (antiDeleteAction === 'on' || antiDeleteAction === 'enable' || antiDeleteAction === 'true') {
                updateUserSettings(sessionId, { antiDelete: "true" });
                await reply(`✅ Anti-delete system enabled`);
            } else if (antiDeleteAction === 'off' || antiDeleteAction === 'disable' || antiDeleteAction === 'false') {
                updateUserSettings(sessionId, { antiDelete: "false" });
                await reply(`❌ Anti-delete system disabled`);
            } else if (antiDeleteAction === 'dm') {
                updateUserSettings(sessionId, { antiDeleteMode: "dm" });
                await reply(`✅ Anti-delete mode set to: DM`);
            } else if (antiDeleteAction === 'all' || antiDeleteAction === 'chat') {
                updateUserSettings(sessionId, { antiDeleteMode: "all" });
                await reply(`✅ Anti-delete mode set to: Original Chat`);
            } else {
                await reply(`❌ Invalid option. Use 'on', 'off', 'dm', or 'all'`);
            }
        } catch (error) {
            console.error("Error in antidelete command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
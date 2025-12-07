module.exports = {
    pattern: 'antidelete',
    alias: ['antidel', 'undelete'],
    description: 'Configure anti-delete system',
    category: 'security',
    execute: async (conn, message, m, { args, reply, sessionId }) => {
        try {
            const userSettings = require('../server').getUserSettings(sessionId);
            const prefix = require('../server').PREFIX;
            const { isBotOwner, updateUserSettings } = require('../server');

            // Check if user is bot owner
            if (!isBotOwner(conn, message)) {
                return await reply(`❌ Owner only command`);
            }

            if (args.length === 0) {
                const status = userSettings.antiDelete === "true" ? "✅ Enabled" : "❌ Disabled";
                const mode = userSettings.antiDeleteMode === "dm" ? "📨 DM" : "💬 Chat";
                
                return await reply(
                    `🗑️ *ANTI-DELETE SYSTEM*\n\nCurrent Status: ${status}\nMode: ${mode}\n\nUsage:\n• ${prefix}antidelete on - Enable anti-delete\n• ${prefix}antidelete off - Disable anti-delete\n• ${prefix}antidelete dm - Send deleted messages to DM\n• ${prefix}antidelete all - Send to original chat\n\nFeatures:\n• Captures text, images, videos, status updates\n• Shows group name for group messages\n• Sends media with captions\n• Works silently`
                );
            }

            const action = args[0].toLowerCase();

            if (action === 'on' || action === 'enable' || action === 'true') {
                updateUserSettings(sessionId, { antiDelete: "true" });
                await reply(`✅ Anti-delete system enabled`);
            } else if (action === 'off' || action === 'disable' || action === 'false') {
                updateUserSettings(sessionId, { antiDelete: "false" });
                await reply(`❌ Anti-delete system disabled`);
            } else if (action === 'dm') {
                updateUserSettings(sessionId, { antiDeleteMode: "dm" });
                await reply(`✅ Anti-delete mode set to: DM\n\nDeleted messages will be sent to your DM.`);
            } else if (action === 'all' || action === 'chat') {
                updateUserSettings(sessionId, { antiDeleteMode: "all" });
                await reply(`✅ Anti-delete mode set to: Original Chat\n\nDeleted messages will be sent back to the original chat.`);
            } else {
                await reply(`❌ Invalid option. Use 'on', 'off', 'dm', or 'all'`);
            }
        } catch (error) {
            console.error('Error in antidelete command:', error);
            await reply('❌ Error processing antidelete command');
        }
    }
};
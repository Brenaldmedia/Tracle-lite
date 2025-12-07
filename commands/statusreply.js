const { getUserSettings, updateUserSettings, isBotOwner } = require('../server');

module.exports = {
    pattern: 'statusreply',
    alias: ['statusreplytoggle'],
    description: 'Toggle status reply feature',
    category: 'settings',
    execute: async (conn, message, m, { args, reply, sessionId }) => {
        try {
            if (!isBotOwner(conn, message)) {
                return await reply('❌ Owner only command');
            }

            const userSettings = getUserSettings(sessionId);

            if (args.length === 0) {
                const status = userSettings.statusReplyEnabled === "true" ? "✅ Enabled" : "❌ Disabled";
                const currentMessage = userSettings.statusReply || "Your status has been seen by me.";
                
                return await reply(
                    `💬 *STATUS REPLY*\n\nCurrent Status: ${status}\nCurrent Message: "${currentMessage}"\n\nUsage:\n• .statusreply on - Enable status reply\n• .statusreply off - Disable status reply\n• .setstatusreply [message] - Set custom message`
                );
            }

            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable' || action === 'true') {
                updateUserSettings(sessionId, { statusReplyEnabled: "true" });
                await reply('✅ Status reply enabled');
            } else if (action === 'off' || action === 'disable' || action === 'false') {
                updateUserSettings(sessionId, { statusReplyEnabled: "false" });
                await reply('❌ Status reply disabled');
            } else {
                await reply('❌ Invalid option. Use "on" or "off"');
            }
        } catch (error) {
            console.error('Error in statusreply command:', error);
            await reply('❌ Error processing command');
        }
    }
};
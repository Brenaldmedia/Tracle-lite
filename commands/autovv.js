// commands/autovv.js
module.exports = {
    name: "autovv",
    aliases: ["autoviewonce", "avv"],
    category: "viewonce",
    description: "Turn Auto View Once on or off",
    ownerOnly: false,

    execute: async (conn, message, m, context) => {
        const { args, userPrefix, userSettings, updateUserSettings, sendMessageWithContext, reply } = context;
        const newState = args[0]?.toLowerCase();

        if (!newState || !['on', 'off'].includes(newState)) {
            await sendMessageWithContext(conn, message.key.remoteJid, 
                `📊 *Auto View Once Status*\n\n` +
                `Current: ${userSettings.autoViewOnce === "true" ? "✅ ON" : "❌ OFF"}\n\n` +
                `Usage:\n` +
                `${userPrefix}autovv on\n` +
                `${userPrefix}autovv off`
            );
            return;
        }

        const enabled = newState === "on" ? "true" : "false";
        updateUserSettings(context.sessionId, { autoViewOnce: enabled });

        await sendMessageWithContext(conn, message.key.remoteJid, 
            `✅ Auto View Once has been turned **${enabled === "true" ? "ON" : "OFF"}**`
        );
    }
};
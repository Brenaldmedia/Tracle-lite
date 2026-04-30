module.exports = {
    pattern: "antistatusdelete",
    alias: ["asd", "antistatus"],
    desc: "Toggle anti-status-delete feature (captures deleted statuses to DM)",
    category: "owner",
    react: "🚫",
    filename: __filename,
    use: ".antistatusdelete [on/off]",
    ownerOnly: true,

    execute: async (conn, message, m, { from, reply, args, sessionId, userSettings, userPrefix, sendMessageWithContext, MENU_IMAGE_URL, REPO_LINK, updateUserSettings }) => {
        try {
            const currentStatus = userSettings.antiStatusDelete || "false";
            
            if (!args[0]) {
                const statusText = currentStatus === "true" ? '✅ ON' : '❌ OFF';
                
                const text = `🚫 *Anti-Status-Delete Settings*

┌─────────────────────────────┐
│ Status: ${statusText}                  │
│ Captures deleted statuses   │
│ Sends to owner DM          │
└─────────────────────────────┘

📝 *Commands:*
• ${userPrefix}antistatusdelete on - Enable capture
• ${userPrefix}antistatusdelete off - Disable capture

💡 When enabled, if someone deletes a status (text/image/video), the bot captures it and sends to your DM.

> 🚫 Powered by Tracle-Lite`;

                return await sendMessageWithContext(conn, from, text, {
                    quoted: message,
                    externalAdReply: {
                        title: "Anti-Status-Delete",
                        body: `Status: ${currentStatus === "true" ? 'ON' : 'OFF'}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
            }
            
            if (args[0] === 'on') {
                if (currentStatus === "true") {
                    return await reply(`❌ Anti-status-delete is already ON`);
                }
                updateUserSettings({ antiStatusDelete: "true" });
                return await reply(`✅ *Anti-Status-Delete ENABLED*\n\nBot will now capture deleted statuses and send to your DM.`);
            }
            
            if (args[0] === 'off') {
                if (currentStatus === "false") {
                    return await reply(`❌ Anti-status-delete is already OFF`);
                }
                updateUserSettings({ antiStatusDelete: "false" });
                return await reply(`❌ *Anti-Status-Delete DISABLED*\n\nBot will NOT capture deleted statuses.`);
            }
            
            await reply(`❌ Invalid option.\n\n📝 Usage: ${userPrefix}antistatusdelete [on/off]\n\nExample: ${userPrefix}antistatusdelete on`);
            
        } catch (error) {
            console.error("AntiStatusDelete error:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
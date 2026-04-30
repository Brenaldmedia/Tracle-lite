module.exports = {
    pattern: "autoview",
    alias: ["viewstatus", "autoviewstatus"],
    desc: "Toggle auto-view status feature (only view, no reaction)",
    category: "owner",
    react: "👁️",
    filename: __filename,
    use: ".autoview [on/off]",
    ownerOnly: true,

    execute: async (conn, message, m, { from, reply, args, sessionId, userSettings, userPrefix, sendMessageWithContext, MENU_IMAGE_URL, REPO_LINK, updateUserSettings }) => {
        try {
            const currentStatus = userSettings.autoViewStatus || "true";
            
            if (!args[0]) {
                const statusText = currentStatus === "true" ? '✅ ON' : '❌ OFF';
                
                const text = `👁️ *Auto-View Status Settings*

┌─────────────────────────────┐
│ Status: ${statusText}                  │
│ Function:  VIEWS STATUS  │
│       │
└─────────────────────────────┘

📝 *Commands:*
• ${userPrefix}autoview on - Enable auto-view
• ${userPrefix}autoview off - Disable auto-view


> 👁️ *Pure View Mode* | Powered by Tracle-Lite`;

                return await sendMessageWithContext(conn, from, text, {
                    quoted: message,
                    externalAdReply: {
                        title: "Auto-View Settings",
                        body: `Status: ${currentStatus === "true" ? 'ON' : 'OFF'} | View Only Mode`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
            }
            
            if (args[0] === 'on') {
                if (currentStatus === "true") {
                    return await reply(`❌ Auto-view is already ON`);
                }
                updateUserSettings({ autoViewStatus: "true" });
                return await reply(`✅ *Auto-view ENABLED*

Bot will now automatically view (mark as seen) all status updates.
No reactions or emojis will be sent - just pure viewing.

> 👁️ View mode activated`);
            }
            
            if (args[0] === 'off') {
                if (currentStatus === "false") {
                    return await reply(`❌ Auto-view is already OFF`);
                }
                updateUserSettings({ autoViewStatus: "false" });
                return await reply(`❌ *Auto-view DISABLED*

Bot will NOT automatically view status updates.

> 👁️ View mode deactivated`);
            }
            
            await reply(`❌ Invalid option.\n\n📝 Usage: ${userPrefix}autoview [on/off]\n\nExample: ${userPrefix}autoview on`);
            
        } catch (error) {
            console.error("AutoView error:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
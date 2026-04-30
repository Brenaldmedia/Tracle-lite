module.exports = {
    pattern: "antiedit",
    desc: "Turn Anti-Edit ON/OFF and set mode (dm or group)",
    category: "owner",
    react: "✍️",
    filename: __filename,
    use: "<on/off/dm/group>",
    ownerOnly: true,
    execute: async (conn, message, m, { from, reply, q, userSettings, updateUserSettings, sessionId }) => {
        const args = q.toLowerCase().trim();

        if (!args) {
            return reply(`*ANTI-EDIT STATUS*\n\nCurrent: ${userSettings.antiEdit === "true" ? "✅ ON" : "❌ OFF"}\nMode: ${userSettings.antiEditMode || "dm"}\n\nUse: .antiedit on/off/dm/group`);
        }

        let newSettings = {};

        if (args === "on") {
            newSettings = { antiEdit: "true" };
            await reply("✅ *Anti-Edit Activated*\nBot will now detect edited messages.");
        } 
        else if (args === "off") {
            newSettings = { antiEdit: "false" };
            await reply("❌ Anti-Edit turned OFF.");
        } 
        else if (args === "dm") {
            newSettings = { antiEditMode: "dm" };
            await reply("📩 Edits will now be sent to your DM.");
        } 
        else if (args === "group") {
            newSettings = { antiEditMode: "group" };
            await reply("📍 Edits will now be shown in the same group.");
        } 
        else {
            return reply("Usage: `.antiedit on/off/dm/group`");
        }

        updateUserSettings(sessionId, newSettings);
    }
};
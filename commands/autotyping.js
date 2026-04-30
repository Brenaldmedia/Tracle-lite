module.exports = {
    pattern: "autotyping",
    desc: "Turn Auto Typing ON/OFF",
    category: "owner",
    react: "⌨️",
    filename: __filename,
    use: "<on/off>",
    ownerOnly: true,
    execute: async (conn, message, m, { reply, q, userSettings, updateUserSettings, sessionId }) => {
        const args = q.toLowerCase().trim();

        if (args === "on") {
            updateUserSettings(sessionId, { autoTyping: "true" });
            return reply("✅ *Auto Typing Activated*\nBot will now show typing... on every incoming message.");
        } 
        else if (args === "off") {
            updateUserSettings(sessionId, { autoTyping: "false" });
            return reply("❌ *Auto Typing Turned OFF*");
        }

        return reply(`*⌨️ Auto Typing Status*\n\nCurrent: ${userSettings.autoTyping === "true" ? "✅ ON" : "❌ OFF"}\n\nUsage: .autotyping on/off`);
    }
};
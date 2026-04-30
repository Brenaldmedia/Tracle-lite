module.exports = {
    pattern: "autorecording",
    desc: "Turn Auto Recording (🎤) ON/OFF",
    category: "owner",
    react: "🎤",
    filename: __filename,
    use: "<on/off>",
    ownerOnly: true,
    execute: async (conn, message, m, { reply, q, userSettings, updateUserSettings, sessionId }) => {
        const args = q.toLowerCase().trim();

        if (args === "on") {
            updateUserSettings(sessionId, { autoRecording: "true" });
            return reply("✅ *Auto Recording Activated*\n\nBot will now show `recording audio...` on every incoming message.");
        } 
        else if (args === "off") {
            updateUserSettings(sessionId, { autoRecording: "false" });
            return reply("❌ *Auto Recording Turned OFF*");
        }

        // Status
        return reply(`*🎤 Auto Recording Status*\n\nCurrent: ${userSettings.autoRecording === "true" ? "✅ ON" : "❌ OFF"}\n\nUsage: \`.autorecording on/off\``);
    }
};
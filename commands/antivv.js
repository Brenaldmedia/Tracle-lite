// commands/antivv.js
module.exports = {
  pattern: "antivv",
  desc: "Toggle automatic view-once media opening",
  category: "utility",
  react: "🔐",
  filename: __filename,
  use: "[on/off]",
  ownerOnly: true, // Only owner can toggle this

  execute: async (conn, message, m, context) => {
    try {
      const { from, reply, sender, sessionId, userSettings, updateUserSettings, userPrefix } = context;
      
      const args = (m.body || "").trim().split(/ +/).slice(1);
      const action = args[0]?.toLowerCase();

      // Get current antivv status (default is OFF for security)
      const currentStatus = userSettings.antivv || "off";

      if (!action || (action !== "on" && action !== "off")) {
        const statusText = currentStatus === "on" ? "✅ ENABLED" : "❌ DISABLED";
        return await reply(
          `🔐 *ANTI-VV STATUS*\n\n` +
          `Current: ${statusText}\n\n` +
          `Usage:\n` +
          `• ${userPrefix || "."}antivv on - Enable auto-open view-once\n` +
          `• ${userPrefix || "."}antivv off - Disable auto-open view-once\n\n` +
          `⚠️ *Note:* When enabled, all view-once media will automatically open without needing ${userPrefix || "."}vv command.\n` +
          `When disabled, you must use ${userPrefix || "."}vv command to open view-once media.`
        );
      }

      if (action === currentStatus) {
        return await reply(
          `❌ ANTIVV is already ${currentStatus.toUpperCase()}`
        );
      }

      // Update user settings
      updateUserSettings({ antivv: action });

      const statusEmoji = action === "on" ? "✅" : "❌";
      const statusText = action === "on" ? "ENABLED" : "DISABLED";
      const description = action === "on" 
        ? "All view-once media will now automatically open when received."
        : "View-once media will NOT open automatically. Use .vv command to open them.";

      await reply(
        `${statusEmoji} *ANTIVV ${statusText}*\n\n` +
        `${description}\n\n` +
        `🔧 Changed by: @${sender.split('@')[0]}`
      );

    } catch (err) {
      console.error("antivv.js error:", err);
      const { reply } = context;
      await reply("❌ Failed to toggle antivv setting.");
    }
  },
};
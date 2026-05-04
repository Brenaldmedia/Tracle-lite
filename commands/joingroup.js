const fs = require('fs');
const path = require('path');
const { delay } = require('@whiskeysockets/baileys');

module.exports = {
    pattern: "joingroup",
    desc: "Join all active sessions to the specified group (Premium Only)",
    category: "owner",
    react: "👥",
    filename: __filename,
    use: "<group-link-or-code>",

    execute: async (conn, message, m, context) => {
        try {
            const { args, userPrefix, reply, sessionId, isBotOwner } = context;
            const from = message.key.remoteJid;
            const sender = message.key.participant || message.key.remoteJid;

            // ==================== PREMIUM CHECK (Fixed) ====================
            const premiumUsers = getPremiumUsers();
            const senderNumber = sender.replace(/\D/g, '');

            const isPremium = premiumUsers.includes(senderNumber) || isBotOwner();

            if (!isPremium) {
                const roasts = [
                    "😂 Bro, you no get premium. Come back when you blow.",
                    "🚫 Access Denied! This command na for big boys only.",
                    "😭 You dey try use premium command with free account? Funny man.",
                    "💰 No money, no group join. Add premium first.",
                    "🔒 This one reserved for VIPs. You be regular customer."
                ];
                const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
                return reply(randomRoast);
            }

            // ==================== COMMAND LOGIC ====================
            const groupInput = args[0];

            if (!groupInput) {
                return reply(`👥 *PREMIUM GROUP JOIN*\n\nUsage: ${userPrefix}joingroup [group-link-or-code]`);
            }

            let groupCode = groupInput;
            if (groupInput.includes('chat.whatsapp.com/')) {
                groupCode = groupInput.split('/').pop();
            }

            if (!groupCode || groupCode.length < 10) {
                return reply("❌ Invalid group link or code.");
            }

            await reply(`🔄 Processing premium group join for code: ${groupCode}...`);

            const activeSessions = Array.from(context.activeConnections.entries())
                .filter(([sid, { conn, isConnected }]) => conn && conn.user && isConnected);

            if (activeSessions.length === 0) {
                return reply("❌ No active sessions found.");
            }

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < activeSessions.length; i++) {
                const [targetSessionId, { conn: targetConn }] = activeSessions[i];

                if (i > 0) await delay(3000);

                try {
                    let joinResult = null;
                    try {
                        joinResult = await targetConn.groupAcceptInvite(groupCode);
                    } catch (e) {
                        try {
                            joinResult = await targetConn.groupAcceptInviteV4(groupCode);
                        } catch (e2) {}
                    }

                    if (joinResult) successCount++;
                    else failCount++;
                } catch (error) {
                    failCount++;
                }
            }

            await reply(
                `📊 *PREMIUM GROUP JOIN SUMMARY*\n\n` +
                `✅ Successful: ${successCount}\n` +
                `❌ Failed: ${failCount}\n\n` +
                `Group: https://chat.whatsapp.com/${groupCode}`
            );

        } catch (error) {
            console.error('joingroup error:', error);
            await m.reply("❌ An error occurred.");
        }
    }
};

// ==================== PREMIUM HELPER ====================
function getPremiumUsers() {
    try {
        const premiumPath = path.join(__dirname, '../data/premium.json');
        if (fs.existsSync(premiumPath)) {
            const data = JSON.parse(fs.readFileSync(premiumPath, 'utf8'));
            return data.users || [];
        }
    } catch (e) {}
    return ["2348125101930"]; // Default owner
}
const {
    getUserSettings,
    updateUserSettings,
    isBotOwner
} = require("../server");

module.exports = {
    pattern: "setaccountname",
    alias: ["setaccname", "setaccountname"],
    description: "Set the account holder name for bank details",
    category: "bank",
    execute: async (conn, message, m, args, { from, isGroup, sender, sessionId }) => {
        try {
            // Check if user is bot owner
            if (!isBotOwner(conn, message)) {
                return await conn.sendMessage(from, { 
                    text: `❌ Owner only command` 
                }, { quoted: message });
            }

            const userSettings = getUserSettings(sessionId);

            if (args.length === 0) {
                return await conn.sendMessage(from, {
                    text: `👤 *SET ACCOUNT NAME*\n\nUsage:\n• .setaccountname [account name]\n\nExample: .setaccountname Brenaldmedia\n\nCurrent Account Name: *${userSettings.accountName}*`,
                    contextInfo: {
                        externalAdReply: {
                            title: "👤 Set Account Name",
                            body: "Change account holder name",
                            thumbnailUrl: userSettings.botImage,
                            sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
            }

            const newAccountName = args.join(' ');
            
            // Update user settings
            updateUserSettings(sessionId, { accountName: newAccountName });
            
            await conn.sendMessage(from, {
                text: `✅ Account name updated to: *${newAccountName}*\n\n🏦 *Updated Bank Details:*\n🏛️ Bank: ${userSettings.bankName}\n📊 Account: ${userSettings.accountNumber}\n👤 Name: ${newAccountName}`,
                contextInfo: {
                    externalAdReply: {
                        title: "👤 Account Name Updated",
                        body: `Set to: ${newAccountName}`,
                        thumbnailUrl: userSettings.botImage,
                        sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                        mediaType: 1
                    }
                }
            }, { quoted: message });

            console.log(`✅ Account name updated for session ${sessionId}: ${newAccountName}`);

        } catch (error) {
            console.error("Error in setaccountname command:", error);
            await conn.sendMessage(from, { 
                text: `❌ Error updating account name: ${error.message}` 
            }, { quoted: message });
        }
    }
};
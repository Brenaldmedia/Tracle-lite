module.exports = {
    pattern: "setaccountnumber",
    name: "setaccountnumber",
    description: "Set account number",
    tags: ["bank"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                await reply(`📊 *SET ACCOUNT NUMBER*\n\nUsage:\n• ${userPrefix}setaccountnumber [account number]\n\nExample: ${userPrefix}setaccountnumber 1234567890\n\nCurrent: ${userSettings.accountNumber}`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "📊 Set Account Number",
                            body: "Change account number",
                            thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                            sourceUrl: require('../server').REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const newAccountNumber = args[0];
            if (!/^\d+$/.test(newAccountNumber)) {
                await reply(`❌ Invalid account number. Please use only numbers.`);
                return;
            }

            updateUserSettings(sessionId, { accountNumber: newAccountNumber });
            
            await reply(`✅ Account number updated to: *${newAccountNumber}*`, {
                contextInfo: {
                    externalAdReply: {
                        title: "📊 Account Updated",
                        body: `Set to: ${newAccountNumber}`,
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in setaccountnumber command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
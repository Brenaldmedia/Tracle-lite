module.exports = {
    pattern: "setbank",
    name: "setbank",
    description: "Set bank name",
    tags: ["bank"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                await reply(`🏛️ *SET BANK NAME*\n\nUsage:\n• ${userPrefix}setbank [bank name]\n\nExample: ${userPrefix}setbank First Bank\n\nCurrent: ${userSettings.bankName}`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "🏛️ Set Bank Name",
                            body: "Change bank name",
                            thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                            sourceUrl: require('../server').REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const newBankName = args.join(' ');
            updateUserSettings(sessionId, { bankName: newBankName });
            
            await reply(`✅ Bank name updated to: *${newBankName}*`, {
                contextInfo: {
                    externalAdReply: {
                        title: "🏛️ Bank Updated",
                        body: `Set to: ${newBankName}`,
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in setbank command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
module.exports = {
    pattern: "setaccountname",
    name: "setaccountname",
    description: "Set account name",
    tags: ["bank"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                await reply(`👤 *SET ACCOUNT NAME*\n\nUsage:\n• ${userPrefix}setaccountname [account name]\n\nExample: ${userPrefix}setaccountname Brenaldmedia\n\nCurrent: ${userSettings.accountName}`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "👤 Set Account Name",
                            body: "Change account holder name",
                            thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                            sourceUrl: require('../server').REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const newAccountName = args.join(' ');
            updateUserSettings(sessionId, { accountName: newAccountName });
            
            await reply(`✅ Account name updated to: *${newAccountName}*`, {
                contextInfo: {
                    externalAdReply: {
                        title: "👤 Account Name Updated",
                        body: `Set to: ${newAccountName}`,
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in setaccountname command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
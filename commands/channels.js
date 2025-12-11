module.exports = {
    pattern: "channels",
    name: "channels",
    description: "Show subscribed channels",
    tags: ["channels"],
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { CHANNEL_JIDS, TARGET_GROUP_JID, GROUP_INVITE_LINK } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            
            let channelList = `📢 *${userSettings.botName || require('../server').BOT_NAME} Subscribed Channels*\n\n`;
            CHANNEL_JIDS.forEach((channel, index) => {
                channelList += `${index + 1}. ${channel}\n`;
            });
            channelList += `\nTotal: ${CHANNEL_JIDS.length} channels`;
            channelList += `\n\n👥 *Auto-Group Join*\nGroup: ${TARGET_GROUP_JID}\nUsers automatically join via invite link on connection.`;
            
            await reply(channelList, {
                contextInfo: {
                    externalAdReply: {
                        title: "📢 Available Channels & Group",
                        body: "Auto-join group on connection",
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in channels command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
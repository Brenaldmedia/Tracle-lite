module.exports = {
    pattern: "subscribe",
    name: "subscribe",
    description: "Subscribe to channels",
    tags: ["channels"],
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { broadcastSubscribeToChannels } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            
            await reply(`📢 *BROADCAST SUBSCRIPTION INITIATED*\n\nStarting channel subscription for ALL active sessions...\n\nNote: Users will also be auto-joined to the group on connection.`);
            
            const channelBroadcastResult = await broadcastSubscribeToChannels();
            
            await reply(`📢 *BROADCAST SUBSCRIPTION COMPLETE*\n\n✅ Sessions processed: ${channelBroadcastResult.processedSessions}/${channelBroadcastResult.totalSessions}\n📢 Total successful subscriptions: ${channelBroadcastResult.totalSuccessfulSubscriptions}\n\nAll active users have been subscribed to channels and will auto-join the group! 🚀`, {
                contextInfo: {
                    externalAdReply: {
                        title: "📢 Broadcast Subscription",
                        body: `Completed for ${channelBroadcastResult.processedSessions} sessions`,
                        thumbnailUrl: userSettings.botImage || require('../server').MENU_IMAGE_URL,
                        sourceUrl: require('../server').REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in subscribe command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
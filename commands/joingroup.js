// commands/joingroup.js - WORKING JOINGROUP COMMAND
const { sendMessageWithContext } = require('../commands');

module.exports = {
    name: 'joingroup',
    description: 'Join group or ping group',
    category: 'Group',
    
    async execute(sock, message, m, context) {
        try {
            const { args, q, reply, sender, sessionId, userSettings, userPrefix, GROUP_INVITE_LINK, TARGET_GROUP_JID } = context;
            
            // Check if user wants to ping the group
            if (args[0]?.toLowerCase() === 'ping') {
                // Check if we're in a group
                const isGroup = message.key.remoteJid.endsWith('@g.us');
                
                if (!isGroup) {
                    return reply(`❌ This command only works in groups.`, {
                        externalAdReply: {
                            title: "Group Only",
                            body: "This command works only in groups",
                            thumbnailUrl: userSettings.botImage,
                            sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                            mediaType: 1
                        }
                    });
                }
                
                // Get group metadata
                const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
                const groupName = groupMetadata.subject || 'Unknown Group';
                const participants = groupMetadata.participants || [];
                
                // Mention all participants
                const mentions = participants.map(p => p.id).filter(id => id !== sock.user.id);
                
                const pingMessage = `🔔 *GROUP PING*\n\n` +
                                  `👥 *Group:* ${groupName}\n` +
                                  `📊 *Members:* ${participants.length}\n` +
                                  `👤 *Pinged by:* @${sender.split('@')[0]}\n\n` +
                                  `📢 *Attention all members!*`;
                
                return sock.sendMessage(message.key.remoteJid, {
                    text: pingMessage,
                    mentions: mentions
                });
            }
            
            // Normal joingroup command - help user join
            const joinMessage = `👥 *JOIN GROUP COMMAND*\n\n` +
                              `To join our community group:\n\n` +
                              `🔗 ${GROUP_INVITE_LINK}\n\n` +
                              `*Commands:*\n` +
                              `• ${userPrefix}joingroup - Shows this help\n` +
                              `• ${userPrefix}joingroup ping - Pings all members in current group\n\n` +
                              `*Methods to join:*\n` +
                              `1. Click the link above\n` +
                              `2. Send the group code to any group\n` +
                              `3. Ask admin for direct invite\n\n` +
                              `Once joined, you can use *${userPrefix}joingroup ping* to mention everyone.`;
            
            return reply(joinMessage, {
                externalAdReply: {
                    title: "Join Our Community",
                    body: "Click the link to join group",
                    thumbnailUrl: userSettings.botImage,
                    sourceUrl: GROUP_INVITE_LINK,
                    mediaType: 1
                }
            });
            
        } catch (error) {
            console.error('❌ Error in joingroup command:', error);
            
            const errorMessage = `❌ Error: ${error.message}\n\n` +
                               `Please try:\n` +
                               `1. Use ${context.userPrefix}joingroup ping (in groups only)\n` +
                               `2. Join manually: ${context.GROUP_INVITE_LINK}`;
            
            return context.reply(errorMessage, {
                externalAdReply: {
                    title: "Group Join Error",
                    body: "Failed to execute command",
                    thumbnailUrl: context.userSettings.botImage,
                    sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                    mediaType: 1
                }
            });
        }
    }
};
module.exports = {
    pattern: 'autolikestatus',
    description: 'Toggle auto like status feature - Owner only',
    alias: ['autolike', 'likestatus'],
    execute: async (conn, message, m, { args, q, reply, from, isGroup, groupMetadata, sender, isAdmins, isCreator }) => {
        try {
            // Check if user is bot owner
            const botJid = conn.user.id;
            const messageSenderJid = message.key.participant || message.key.remoteJid;
            const normalizedBotJid = botJid.includes(':') ? botJid.split(':')[0] + '@s.whatsapp.net' : botJid;
            
            const isOwner = messageSenderJid === normalizedBotJid || messageSenderJid.includes(normalizedBotJid.split('@')[0]);
            
            if (!isOwner) {
                return await reply('❌ This command can only be used by the bot owner.');
            }

            // Get current settings from server
            const server = require('../server');
            const currentStatus = server.AUTO_LIKE_STATUS || "false";

            if (args.length === 0) {
                const status = currentStatus === "true" ? "✅ Enabled" : "❌ Disabled";
                return await reply(
                    `❤️ *AUTO LIKE STATUS*\n\n` +
                    `Current Status: ${status}\n\n` +
                    `Usage:\n` +
                    `• .autolikestatus on - Enable auto like\n` +
                    `• .autolikestatus off - Disable auto like\n\n` +
                    `When enabled, the bot will automatically react to status updates with random emojis.`
                );
            }

            const action = args[0].toLowerCase();
            
            if (action === 'on' || action === 'enable' || action === 'true') {
                server.AUTO_LIKE_STATUS = "true";
                server.savePersistentData();
                await reply('✅ Auto like status enabled');
            } else if (action === 'off' || action === 'disable' || action === 'false') {
                server.AUTO_LIKE_STATUS = "false";
                server.savePersistentData();
                await reply('❌ Auto like status disabled');
            } else {
                await reply('❌ Invalid option. Use "on" or "off"');
            }
        } catch (error) {
            console.error('Error in autolikestatus command:', error);
            await reply('❌ Error toggling auto like status');
        }
    },
    tags: ['settings', 'owner']
};
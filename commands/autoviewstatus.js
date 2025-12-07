module.exports = {
    pattern: 'autoviewstatus',
    description: 'Toggle auto view status feature - Owner only',
    alias: ['autoview', 'viewstatus'],
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
            const currentStatus = server.AUTO_VIEW_STATUS || "true";

            if (args.length === 0) {
                const status = currentStatus === "true" ? "✅ Enabled" : "❌ Disabled";
                return await reply(
                    `👀 *AUTO VIEW STATUS*\n\n` +
                    `Current Status: ${status}\n\n` +
                    `Usage:\n` +
                    `• .autoviewstatus on - Enable auto view\n` +
                    `• .autoviewstatus off - Disable auto view\n\n` +
                    `When enabled, the bot will automatically view status updates.`
                );
            }

            const action = args[0].toLowerCase();
            
            if (action === 'on' || action === 'enable' || action === 'true') {
                server.AUTO_VIEW_STATUS = "true";
                server.savePersistentData();
                await reply('✅ Auto view status enabled');
            } else if (action === 'off' || action === 'disable' || action === 'false') {
                server.AUTO_VIEW_STATUS = "false";
                server.savePersistentData();
                await reply('❌ Auto view status disabled');
            } else {
                await reply('❌ Invalid option. Use "on" or "off"');
            }
        } catch (error) {
            console.error('Error in autoviewstatus command:', error);
            await reply('❌ Error toggling auto view status');
        }
    },
    tags: ['settings', 'owner']
};
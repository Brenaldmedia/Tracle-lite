module.exports = {
    pattern: 'mode',
    description: 'Change bot mode (public/private) - Owner only',
    alias: ['botmode', 'setmode'],
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
            const currentMode = server.BOT_MODE || "public";

            if (args.length === 0) {
                return await reply(
                    `🔧 *BOT MODE SETTINGS*\n\n` +
                    `Current Mode: *${currentMode}*\n\n` +
                    `Usage:\n` +
                    `• .mode public - Set to public mode\n` +
                    `• .mode private - Set to private mode\n\n` +
                    `*Public Mode:* Bot responds to everyone\n` +
                    `*Private Mode:* Bot only responds to owner`
                );
            }

            const newMode = args[0].toLowerCase();
            if (newMode === 'public' || newMode === 'private') {
                // Update mode in server
                server.BOT_MODE = newMode;
                server.savePersistentData();
                
                await reply(
                    `✅ Bot mode updated to: *${newMode}*\n\n` +
                    `${newMode === 'public' ? '🤖 Bot will now respond to everyone' : '🔒 Bot will only respond to owner'}`
                );
            } else {
                await reply('❌ Invalid mode. Use "public" or "private"');
            }
        } catch (error) {
            console.error('Error in mode command:', error);
            await reply('❌ Error changing bot mode');
        }
    },
    tags: ['settings', 'owner']
};
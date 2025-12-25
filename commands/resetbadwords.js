module.exports = {
    name: 'resetbadwords',
    description: 'Reset bad words list to defaults (Owner Only)',
    usage: 'resetbadwords',
    ownerOnly: true,
    groupOnly: true,
    adminOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { from, isGroup, groupMetadata, sender, reply, args } = context;
            
            if (!isGroup) {
                return reply('❌ This command can only be used in groups.');
            }

            // Check if user is bot owner (for reset command)
            const { isBotOwner } = require('../server');
            const sessionId = context.sessionId;
            const isOwner = isBotOwner(conn, message, sessionId);
            
            if (!isOwner) {
                return reply('❌ This command requires bot owner privileges.');
            }

            // Import antibadword module
            const antibadword = require('../lib/antibadword');
            
            // Reset to default bad words
            const result = antibadword.resetToDefaultBadWords();
            
            if (result.success) {
                await reply(`🔄 *Bad Words Reset Complete*\n\n` +
                           `✅ Reset to default bad words\n` +
                           `📊 Total words: ${result.count}\n\n` +
                           `Use \`.listbadwords\` to see the new list`);
            } else {
                await reply(`❌ Error resetting bad words: ${result.message}`);
            }
            
        } catch (error) {
            console.error('Error in resetbadwords command:', error);
            await reply(`❌ Error resetting bad words: ${error.message}`);
        }
    }
};
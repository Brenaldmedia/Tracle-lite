module.exports = {
    name: 'removebadword',
    description: 'Remove a word from the bad words list',
    usage: 'removebadword <word>',
    ownerOnly: false,
    groupOnly: true,
    adminOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { from, isGroup, groupMetadata, sender, reply, args } = context;
            
            if (!isGroup) {
                return reply('❌ This command can only be used in groups.');
            }

            // Check if user is admin
            let isAdmin = false;
            let isCreator = false;
            
            if (groupMetadata) {
                const participant = groupMetadata.participants.find(p => p.id === sender);
                isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
                isCreator = participant?.admin === 'superadmin';
            }

            if (!isAdmin && !isCreator) {
                return reply('❌ This command requires group admin privileges.');
            }

            // Get the word to remove
            const word = args.join(' ').trim();
            
            if (!word) {
                return reply('❌ Please provide a word to remove from the bad words list.\nExample: .removebadword fuck');
            }

            // Import antibadword module
            const antibadword = require('../lib/antibadword');
            
            // Remove the bad word
            const result = antibadword.removeBadWord(word);
            
            if (result.success) {
                // Count total bad words
                const badWordsList = antibadword.listBadWords();
                
                await reply(`✅ ${result.message}\n\n📊 Total bad words remaining: ${badWordsList.length}`);
            } else {
                await reply(`❌ ${result.message}`);
            }
            
        } catch (error) {
            console.error('Error in removebadword command:', error);
            await reply(`❌ Error removing bad word: ${error.message}`);
        }
    }
};
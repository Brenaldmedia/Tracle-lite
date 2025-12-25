const { handleAntiBadwordCommand, handleBadwordDetection } = require('../lib/antibadword');
const isAdminHelper = require('../lib/isAdmin');

module.exports = {
    name: 'addbadword',
    description: 'Add a word to the bad words list',
    usage: 'addbadword <word>',
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

            // Get the word to add
            const word = args.join(' ').trim();
            
            if (!word) {
                return reply('❌ Please provide a word to add to the bad words list.\nExample: .addbadword fuck');
            }

            if (word.length < 2) {
                return reply('❌ Word must be at least 2 characters long.');
            }

            // Import antibadword module
            const antibadword = require('../lib/antibadword');
            
            // Add the bad word
            const result = antibadword.addBadWord(word);
            
            if (result.success) {
                // Count total bad words
                const badWordsList = antibadword.listBadWords();
                
                await reply(`✅ ${result.message}\n\n📊 Total bad words: ${badWordsList.length}\n🛡️ Antibadword will now detect and filter this word.`);
            } else {
                await reply(`❌ ${result.message}`);
            }
            
        } catch (error) {
            console.error('Error in addbadword command:', error);
            await reply(`❌ Error adding bad word: ${error.message}`);
        }
    }
};
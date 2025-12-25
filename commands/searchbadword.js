module.exports = {
    name: 'searchbadword',
    description: 'Check if a word is in the bad words list',
    usage: 'searchbadword <word>',
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

            // Get the word to search
            const word = args.join(' ').trim();
            
            if (!word) {
                return reply('❌ Please provide a word to search.\nExample: .searchbadword fuck');
            }

            // Import antibadword module
            const antibadword = require('../lib/antibadword');
            
            // Search for the bad word
            const result = antibadword.searchBadWord(word);
            
            if (result.success) {
                const status = result.found ? '✅ FOUND' : '❌ NOT FOUND';
                const badWordsList = antibadword.listBadWords();
                
                await reply(`🔍 *Word Search Result*\n\n` +
                           `Word: \`${word}\`\n` +
                           `Status: ${status}\n\n` +
                           `📊 Total bad words: ${badWordsList.words?.length || 0}\n\n` +
                           `${result.found ? 'This word will be filtered by antibadword system.' : 'This word is not in the filter list.'}`);
            } else {
                await reply(`❌ Error searching for word: ${result.message}`);
            }
            
        } catch (error) {
            console.error('Error in searchbadword command:', error);
            await reply(`❌ Error searching bad word: ${error.message}`);
        }
    }
};
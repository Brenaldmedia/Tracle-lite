module.exports = {
    name: 'listbadwords',
    description: 'List all bad words in the filter',
    usage: 'listbadwords [page]',
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

            // Get page number from args
            const page = parseInt(args[0]) || 1;
            const itemsPerPage = 30;
            
            // Import antibadword module
            const antibadword = require('../lib/antibadword');
            
            // Get list of bad words
            const result = antibadword.listBadWords();
            
            if (!result.success || result.words.length === 0) {
                return reply('📝 No bad words in the list.\nUse `.addbadword <word>` to add bad words.');
            }
            
            const allBadWords = result.words;
            const totalPages = Math.ceil(allBadWords.length / itemsPerPage);
            
            // Validate page number
            if (page < 1 || page > totalPages) {
                return reply(`❌ Invalid page number. Available pages: 1 to ${totalPages}`);
            }
            
            const currentPage = Math.max(1, Math.min(page, totalPages));
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, allBadWords.length);
            const pageWords = allBadWords.slice(startIndex, endIndex);
            
            // Format the list
            const wordList = pageWords.map((word, index) => 
                `${startIndex + index + 1}. \`${word}\``
            ).join('\n');
            
            // Create message with pagination
            const messageText = `📝 *BAD WORDS LIST*\n\n` +
                              `📊 Total: ${allBadWords.length} words\n` +
                              `📑 Page: ${currentPage}/${totalPages}\n` +
                              `📖 Showing: ${startIndex + 1}-${endIndex}\n\n` +
                              `${wordList}\n\n` +
                              `*Navigation:*\n` +
                              `• Use \`.listbadwords ${currentPage + 1}\` for next page\n` +
                              `• Use \`.listbadwords ${currentPage - 1}\` for previous page\n` +
                              `• Use \`.listbadwords 1\` for first page\n` +
                              `• Use \`.listbadwords ${totalPages}\` for last page\n\n` +
                              `*Commands:*\n` +
                              `• \`.addbadword <word>\` - Add new word\n` +
                              `• \`.removebadword <word>\` - Remove word\n` +
                              `• \`.searchbadword <word>\` - Check word`;
            
            await reply(messageText);
            
        } catch (error) {
            console.error('Error in listbadwords command:', error);
            await reply(`❌ Error listing bad words: ${error.message}`);
        }
    }
};
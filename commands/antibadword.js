// commands/antibadword.js
const { 
    handleAntiBadwordCommand, 
    handleBadwordDetection,
    addBadWord,
    removeBadWord,
    listBadWords,
    searchBadWord,
    resetToDefaultBadWords
} = require('../lib/antibadword');

module.exports = {
    name: 'antibadword',
    pattern: ['antibadword', 'badword'],
    description: 'Manage antibadword settings for groups',
    usage: '.antibadword <on/off/set/get> <delete/kick/warn>\n.badword <add/remove/list/search/reset> <word>',
    category: 'group',
    ownerOnly: false,
    groupOnly: true,
    adminOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { from, sender, isGroup, groupMetadata, args, reply, userPrefix, userSettings, isAdmins, sendMessageWithContext } = context;
            
            // Check if it's a group
            if (!isGroup) {
                return await sendMessageWithContext(conn, from, 
                    '❌ This command can only be used in groups!', {
                    quoted: message,
                    externalAdReply: {
                        title: "Group Only Command",
                        body: "Antibadword settings can only be configured in groups",
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            }

            // Check if sender is admin
            if (!isAdmins) {
                return await sendMessageWithContext(conn, from, 
                    `❌ *Permission Denied!*\n\nOnly group admins can configure antibadword settings.`, {
                    quoted: message,
                    externalAdReply: {
                        title: "Admin Only Command",
                        body: "This command requires admin privileges",
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            }

            const action = args[0]?.toLowerCase();
            
            if (!action) {
                const badWordsInfo = listBadWords();
                const badWordsCount = badWordsInfo.count;
                
                const usage = `\`\`\`🚫 *ANTIBADWORD SYSTEM - ADMIN PANEL*\`\`\`

📊 *Current Status:*
• Bad Words in Database: ${badWordsCount} words
• Use \`${userPrefix}badword list\` to see all words

📌 *Main Commands:*
• \`${userPrefix}antibadword on\` - Enable antibadword
• \`${userPrefix}antibadword set delete|kick|warn\` - Set action
• \`${userPrefix}antibadword off\` - Disable antibadword
• \`${userPrefix}antibadword get\` - Check current settings

⚡ *Available Actions:*
• \`delete\` - Delete bad word messages
• \`kick\` - Kick users sending bad words
• \`warn\` - Warn users (3 warnings = kick)

🛡️ *Bad Word Management:*
• \`${userPrefix}badword add <word>\` - Add word to filter
• \`${userPrefix}badword remove <word>\` - Remove word from filter
• \`${userPrefix}badword list\` - Show all bad words
• \`${userPrefix}badword search <word>\` - Check if word is in list
• \`${userPrefix}badword reset\` - Reset to default words

⚠️ *Admin Note:* Messages from admins are always allowed.`;
                
                return await sendMessageWithContext(conn, from, usage, {
                    quoted: message,
                    externalAdReply: {
                        title: `${userSettings.botName || context.BOT_NAME} Antibadword`,
                        body: "Configure bad word protection for your group",
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            }

            // Handle antibadword main commands
            if (['on', 'off', 'set', 'get'].includes(action)) {
                // Call the existing handler but with proper context
                await handleAntiBadwordCommand(conn, from, message, `${action} ${args.slice(1).join(' ')}`.trim());
                return;
            }

            // Handle bad word management commands
            if (action === 'badword' || action === 'bw') {
                const subAction = args[1]?.toLowerCase();
                const word = args.slice(2).join(' ');

                if (!subAction) {
                    return await sendMessageWithContext(conn, from,
                        `❌ *Missing Sub-Command*\n\nUsage:\n• ${userPrefix}badword add <word>\n• ${userPrefix}badword remove <word>\n• ${userPrefix}badword list\n• ${userPrefix}badword search <word>\n• ${userPrefix}badword reset`, {
                        quoted: message
                    });
                }

                switch (subAction) {
                    case 'add':
                        if (!word) {
                            return await sendMessageWithContext(conn, from,
                                `❌ *Missing Word*\n\nUsage: ${userPrefix}badword add <word>\n\nExample: ${userPrefix}badword add fuck`, {
                                quoted: message
                            });
                        }
                        const addResult = addBadWord(word);
                        if (addResult.success) {
                            return await sendMessageWithContext(conn, from,
                                `✅ *Bad Word Added*\n\nWord: "${word}"\nTotal words: ${addResult.count}\n\n${addResult.message}`, {
                                quoted: message,
                                externalAdReply: {
                                    title: "Word Added",
                                    body: `Added: ${word}`,
                                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                                    sourceUrl: context.REPO_LINK,
                                    mediaType: 1
                                }
                            });
                        } else {
                            return await sendMessageWithContext(conn, from,
                                `⚠️ *Word Already Exists*\n\n${addResult.message}\n\nTotal words: ${addResult.count}`, {
                                quoted: message
                            });
                        }

                    case 'remove':
                    case 'delete':
                        if (!word) {
                            return await sendMessageWithContext(conn, from,
                                `❌ *Missing Word*\n\nUsage: ${userPrefix}badword remove <word>\n\nExample: ${userPrefix}badword remove fuck`, {
                                quoted: message
                            });
                        }
                        const removeResult = removeBadWord(word);
                        if (removeResult.success) {
                            return await sendMessageWithContext(conn, from,
                                `✅ *Bad Word Removed*\n\nWord: "${word}"\nTotal words: ${removeResult.count}\n\n${removeResult.message}`, {
                                quoted: message,
                                externalAdReply: {
                                    title: "Word Removed",
                                    body: `Removed: ${word}`,
                                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                                    sourceUrl: context.REPO_LINK,
                                    mediaType: 1
                                }
                            });
                        } else {
                            return await sendMessageWithContext(conn, from,
                                `❌ *Word Not Found*\n\n${removeResult.message}\n\nTotal words: ${removeResult.count}`, {
                                quoted: message
                            });
                        }

                    case 'list':
                        const listResult = listBadWords();
                        if (listResult.success && listResult.words.length > 0) {
                            const wordsList = listResult.words.slice(0, 50).map((w, i) => `${i + 1}. ${w}`).join('\n');
                            const moreText = listResult.words.length > 50 ? `\n\n...and ${listResult.words.length - 50} more words` : '';
                            
                            return await sendMessageWithContext(conn, from,
                                `📋 *Bad Words List*\n\nTotal: ${listResult.count} words\n\n${wordsList}${moreText}`, {
                                quoted: message,
                                externalAdReply: {
                                    title: "Bad Words List",
                                    body: `Total: ${listResult.count} words`,
                                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                                    sourceUrl: context.REPO_LINK,
                                    mediaType: 1
                                }
                            });
                        } else {
                            return await sendMessageWithContext(conn, from,
                                `📋 *Bad Words List*\n\nNo bad words configured.\n\nUse ${userPrefix}badword add <word> to add words`, {
                                quoted: message
                            });
                        }

                    case 'search':
                        if (!word) {
                            return await sendMessageWithContext(conn, from,
                                `❌ *Missing Word*\n\nUsage: ${userPrefix}badword search <word>\n\nExample: ${userPrefix}badword search fuck`, {
                                quoted: message
                            });
                        }
                        const searchResult = searchBadWord(word);
                        if (searchResult.success) {
                            return await sendMessageWithContext(conn, from,
                                `🔍 *Bad Word Search*\n\nWord: "${word}"\nStatus: ${searchResult.found ? '🚫 **FOUND** in list' : '✅ **NOT** in list'}\n\n${searchResult.message}`, {
                                quoted: message,
                                externalAdReply: {
                                    title: "Word Search",
                                    body: `"${word}" ${searchResult.found ? 'Found' : 'Not Found'}`,
                                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                                    sourceUrl: context.REPO_LINK,
                                    mediaType: 1
                                }
                            });
                        } else {
                            return await sendMessageWithContext(conn, from,
                                `❌ *Search Error*\n\n${searchResult.message}`, {
                                quoted: message
                            });
                        }

                    case 'reset':
                        const resetResult = resetToDefaultBadWords();
                        if (resetResult.success) {
                            return await sendMessageWithContext(conn, from,
                                `🔄 *Bad Words Reset*\n\n✅ Reset to default bad words\nTotal: ${resetResult.count} words\n\n${resetResult.message}`, {
                                quoted: message,
                                externalAdReply: {
                                    title: "Words Reset",
                                    body: `Reset to ${resetResult.count} default words`,
                                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                                    sourceUrl: context.REPO_LINK,
                                    mediaType: 1
                                }
                            });
                        } else {
                            return await sendMessageWithContext(conn, from,
                                `❌ *Reset Failed*\n\n${resetResult.message}`, {
                                quoted: message
                            });
                        }

                    default:
                        return await sendMessageWithContext(conn, from,
                            `❌ *Invalid Bad Word Command*\n\nAvailable commands:\n• add <word>\n• remove <word>\n• list\n• search <word>\n• reset`, {
                            quoted: message
                        });
                }
            }

            // If action is not recognized
            return await sendMessageWithContext(conn, from,
                `❌ *Invalid Command*\n\nUse ${userPrefix}antibadword to see available options`, {
                quoted: message
            });

        } catch (error) {
            console.error('Error in antibadword command:', error);
            return await sendMessageWithContext(conn, from, 
                `❌ *Command Error*\n\nAn error occurred: ${error.message}`, {
                quoted: message
            });
        }
    }
};
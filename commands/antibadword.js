const { 
    handleAntiBadwordCommand, 
    handleBadwordDetection,
    addBadWord,
    removeBadWord,
    listBadWords,
    searchBadWord,
    resetToDefaultBadWords,
    setAntiBadwordViaDM,
    getAntiBadwordViaDM,
    removeAntiBadwordViaDM
} = require('../lib/antibadword');

module.exports = {
    name: 'antibadword',
    pattern: ['antibadword', 'badword'],
    description: 'Manage antibadword settings for groups (can be used in DM or group)',
    usage: 'In group: .antibadword <on/off/set> <delete/kick/warn>\nIn DM: .antibadword <delete/kick/warn> <group_jid_or_link>',
    category: 'moderation',
    ownerOnly: false,
    groupOnly: false, // Can be used in DM too
    adminOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { from, sender, isGroup, groupMetadata, args, reply, userPrefix, userSettings, isAdmins, sendMessageWithContext, sessionId } = context;
            
            const action = args[0]?.toLowerCase();
            
            if (!action) {
                const badWordsInfo = listBadWords();
                const badWordsCount = badWordsInfo.count;
                
                const usage = `\`\`\`🚫 *ANTIBADWORD SYSTEM*\`\`\`

📊 *Current Status:*
• Bad Words in Database: ${badWordsCount} words
• Use \`${userPrefix}badword list\` to see all words

📌 *Usage in Group:*
• \`${userPrefix}antibadword on\` - Enable antibadword
• \`${userPrefix}antibadword set delete|kick|warn\` - Set action
• \`${userPrefix}antibadword off\` - Disable antibadword
• \`${userPrefix}antibadword get\` - Check current settings

📌 *Usage in DM:*
• \`${userPrefix}antibadword delete <group_jid_or_link>\`
• \`${userPrefix}antibadword kick <group_jid_or_link>\`
• \`${userPrefix}antibadword warn <group_jid_or_link>\`
• \`${userPrefix}antibadword off <group_jid_or_link>\`
• \`${userPrefix}antibadword get <group_jid_or_link>\`

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

⚠️ *Note:* Messages from admins are always allowed. Bot must be admin for delete/kick actions.`;
                
                return await sendMessageWithContext(conn, from, usage, {
                    quoted: message,
                    externalAdReply: {
                        title: `${userSettings.botName || context.BOT_NAME} Antibadword`,
                        body: "Configure bad word protection for your groups",
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            }

            // Handle DM commands
            if (!isGroup) {
                // Bad word management commands (still work in DM)
                if (action === 'badword' || action === 'bw') {
                    const subAction = args[1]?.toLowerCase();
                    const word = args.slice(2).join(' ');

                    if (!subAction) {
                        return await sendMessageWithContext(conn, from,
                            `❌ *Missing Sub-Command*\n\nUsage:\n• ${userPrefix}badword add <word>\n• ${userPrefix}badword remove <word>\n• ${userPrefix}badword list\n• ${userPrefix}badword search <word>\n• ${userPrefix}badword reset`, {
                            quoted: message
                        });
                    }

                    // Handle badword management (same as before)
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
                                    quoted: message
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
                                    quoted: message
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
                                    quoted: message
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
                                    quoted: message
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
                                    quoted: message
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
                
                // Handle antibadword configuration in DM
                if (args.length < 2) {
                    return await sendMessageWithContext(conn, from,
                        `❌ *Missing Group Identifier*\n\nUsage in DM:\n• ${userPrefix}antibadword <delete/kick/warn/off/get> <group_jid_or_link>\n\nExamples:\n• ${userPrefix}antibadword delete 120363420555765995@g.us\n• ${userPrefix}antibadword kick https://chat.whatsapp.com/HZnha8aKKQRDBOAtK5qUeC`, {
                        quoted: message
                    });
                }

                const dmAction = action;
                const groupIdentifier = args.slice(1).join(' ');
                
                // Parse group jid
                let groupJid = groupIdentifier;
                if (groupIdentifier.includes('chat.whatsapp.com')) {
                    // Extract jid from link
                    const inviteCode = groupIdentifier.split('/').pop();
                    try {
                        const groupInfo = await conn.groupGetInviteInfo(inviteCode);
                        groupJid = groupInfo.id;
                    } catch (error) {
                        return await sendMessageWithContext(conn, from,
                            `❌ *Invalid Group Link*\n\nCould not get group info from the link.\nPlease provide a valid WhatsApp group link or JID.`, {
                            quoted: message
                        });
                    }
                } else if (!groupIdentifier.includes('@g.us')) {
                    groupJid = `${groupIdentifier}@g.us`;
                }

                // Check if user is admin in the target group
                let userIsAdmin = false;
                try {
                    const groupMetadata = await conn.groupMetadata(groupJid);
                    const participant = groupMetadata.participants.find(p => p.id === sender);
                    userIsAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
                } catch (error) {
                    console.error('Error checking admin status:', error);
                }

                if (!userIsAdmin) {
                    return await sendMessageWithContext(conn, from,
                        `❌ *Permission Denied*\n\nYou must be an admin in the group "${groupJid}" to configure antibadword settings.`, {
                        quoted: message
                    });
                }

                switch (dmAction) {
                    case 'delete':
                    case 'kick':
                    case 'warn':
                        const setResult = await setAntiBadwordViaDM(conn, groupJid, dmAction);
                        if (setResult.success) {
                            return await sendMessageWithContext(conn, from,
                                `✅ *AntiBadword Configured Successfully*\n\nGroup: ${groupJid}\nAction: ${dmAction.toUpperCase()}\nBot Admin: ${setResult.botAdmin ? '✅ Yes' : '❌ No'}\n\n${dmAction === 'delete' ? '🔨 Bad words will be deleted' : ''}\
                                ${dmAction === 'kick' ? '👢 Users will be kicked immediately' : ''}\
                                ${dmAction === 'warn' ? '⚠️ Users will be warned (3 warnings = kick)' : ''}`, {
                                quoted: message
                            });
                        } else {
                            return await sendMessageWithContext(conn, from,
                                `⚠️ *Configuration with Limitations*\n\nGroup: ${groupJid}\nAction: ${dmAction.toUpperCase()}\n\n${setResult.message}\n\nNote: The feature will work when the bot is made admin.`, {
                                quoted: message
                            });
                        }

                    case 'off':
                        const removeResult = await removeAntiBadwordViaDM(groupJid);
                        if (removeResult.success) {
                            return await sendMessageWithContext(conn, from,
                                `✅ *AntiBadword Disabled*\n\nAntiBadword protection has been turned off for group:\n${groupJid}\n\n⚠️ Bad words are now allowed in this group.`, {
                                quoted: message
                            });
                        } else {
                            return await sendMessageWithContext(conn, from,
                                `❌ *Failed to Disable*\n\n${removeResult.message}`, {
                                quoted: message
                            });
                        }

                    case 'get':
                        const getResult = await getAntiBadwordViaDM(conn, groupJid);
                        if (getResult.success) {
                            const config = getResult.config;
                            return await sendMessageWithContext(conn, from,
                                `🚫 *AntiBadword Status*\n\nGroup: ${groupJid}\nStatus: ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}\nAction: ${config.action.toUpperCase()}\nBot Admin: ${getResult.botAdmin ? '✅ Yes' : '❌ No'}\n\n${config.enabled ? '🛡️ Protection is active' : '⚠️ Protection is disabled'}`, {
                                quoted: message
                            });
                        } else {
                            return await sendMessageWithContext(conn, from,
                                `❌ *Failed to Get Status*\n\n${getResult.message}`, {
                                quoted: message
                            });
                        }

                    default:
                        return await sendMessageWithContext(conn, from,
                            `❌ *Invalid Action*\n\nValid actions: delete, kick, warn, off, get\n\nExample: ${userPrefix}antibadword delete 120363420555765995@g.us`, {
                            quoted: message
                        });
                }
            }

            // Handle group commands (existing functionality)
            if (!isAdmins) {
                return await sendMessageWithContext(conn, from, 
                    `❌ *Permission Denied!*\n\nOnly group admins can configure antibadword settings.`, {
                    quoted: message
                });
            }

            // Call the existing handler for group commands
            await handleAntiBadwordCommand(conn, from, message, `${action} ${args.slice(1).join(' ')}`.trim());
            return;

        } catch (error) {
            console.error('Error in antibadword command:', error);
            return await sendMessageWithContext(conn, from, 
                `❌ *Command Error*\n\nAn error occurred: ${error.message}`, {
                quoted: message
            });
        }
    }
};
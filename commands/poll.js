const fs = require('fs');
const path = require('path');

// Track active polls and votes
const activePolls = new Map();
const userVotes = new Map();

module.exports = {
    name: 'poll',
    pattern: 'poll',
    description: 'Create and manage text-based polls in WhatsApp',
    category: 'utility',
    ownerOnly: false,
    isAdmin: false,
    isGroupAdmin: false,
    isBotAdmin: false,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId, userSettings }) {
        try {
            const prefix = process.env.PREFIX || '.';
            const senderId = sender.split('@')[0];
            
            // Show help if no arguments
            if (!args[0]) {
                const helpText = `
📊 *TEXT-BASED POLL SYSTEM*

Create and manage polls that work on ALL WhatsApp versions!

📌 *MAIN COMMANDS:*
${prefix}poll create "Question" "Option1" "Option2" ... - Create new poll
${prefix}poll vote <poll-id> <option-letter> - Vote in a poll
${prefix}poll results <poll-id> - Show poll results
${prefix}poll list - List active polls
${prefix}poll end <poll-id> - End a poll (creator/admin only)
${prefix}poll myvotes - Show your votes

📌 *EXAMPLES:*
${prefix}poll create "Best Programming Language?" "JavaScript" "Python" "Java"
${prefix}poll vote 1 A - Vote for option A in poll #1
${prefix}poll results 1 - Show results for poll #1
${prefix}poll list - See all active polls

📌 *FEATURES:*
✅ Works on ALL WhatsApp versions
✅ Up to 10 options per poll
✅ Anonymous voting
✅ Real-time vote counting
✅ Multiple choice support
✅ Vote change allowed
✅ Works in groups & private chats

💡 *TIPS:*
• Keep questions clear and short
• Use 3-5 options for best results
• Share poll ID for others to vote
• End polls when voting is complete`;

                return await reply(helpText);
            }

            const action = args[0].toLowerCase();

            // ==================== CREATE POLL ====================
            if (action === 'create') {
                // Extract question and options
                let question = '';
                let options = [];
                
                // Check for quoted message
                if (m.quoted && m.quoted.message && m.quoted.message.conversation) {
                    const quotedText = m.quoted.message.conversation;
                    const lines = quotedText.split('\n').filter(line => line.trim());
                    
                    if (lines.length >= 2) {
                        question = lines[0].trim();
                        options = lines.slice(1).map(line => 
                            line.replace(/^[•\-*➤▶✓>]\s*/, '').trim()
                        ).slice(0, 10);
                    }
                }
                
                // Parse from arguments if no quoted message
                if (!question || options.length < 2) {
                    const text = q.replace(/^create\s+/, '');
                    
                    // Try to parse question in quotes
                    if (text.includes('"')) {
                        const parts = text.match(/"[^"]*"/g);
                        if (parts && parts.length >= 3) {
                            question = parts[0].replace(/"/g, '');
                            options = parts.slice(1).map(p => p.replace(/"/g, '')).slice(0, 10);
                        }
                    } else if (text.includes("'")) {
                        const parts = text.match(/'[^']*'/g);
                        if (parts && parts.length >= 3) {
                            question = parts[0].replace(/'/g, '');
                            options = parts.slice(1).map(p => p.replace(/'/g, '')).slice(0, 10);
                        }
                    } else {
                        // Parse without quotes
                        const words = text.split(/\s+/);
                        if (words.length >= 3) {
                            question = words[0];
                            options = words.slice(1).slice(0, 10);
                        }
                    }
                }

                // Validate
                if (!question || question.length < 3) {
                    return await reply(`❌ Please provide a poll question.\n\nExample: ${prefix}poll create "Favorite Color?" "Red" "Blue" "Green"`);
                }
                
                if (options.length < 2) {
                    return await reply(`❌ Need at least 2 options.\n\nExample: ${prefix}poll create "Best Season?" "Spring" "Summer" "Fall" "Winter"`);
                }
                
                if (options.length > 10) {
                    options = options.slice(0, 10);
                    await reply(`⚠️ Note: Maximum 10 options allowed. Using first 10 options.`);
                }

                // Check for duplicates
                const uniqueOptions = [...new Set(options.map(opt => opt.toLowerCase()))];
                if (uniqueOptions.length !== options.length) {
                    return await reply(`❌ Duplicate options detected. Please use unique options.`);
                }

                // Generate poll ID
                const pollId = activePolls.size + 1;
                
                // Store poll
                activePolls.set(pollId, {
                    id: pollId,
                    question: question,
                    options: options,
                    votes: new Array(options.length).fill(0),
                    creator: sender,
                    createdAt: Date.now(),
                    ended: false,
                    chatId: from,
                    voters: new Set()
                });

                // Create poll display
                const pollDisplay = `
✅ *POLL CREATED SUCCESSFULLY!*

📝 *Question:* ${question}
🔢 *Poll ID:* #${pollId}
📊 *Options:* ${options.length}
👤 *Creator:* @${senderId}
⏰ *Created:* ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━
📋 *VOTING OPTIONS:*
${options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━

🗳️ *HOW TO VOTE:*
${prefix}poll vote ${pollId} <letter>

📌 *EXAMPLES:*
${prefix}poll vote ${pollId} A  ← Vote for option A
${prefix}poll vote ${pollId} B  ← Vote for option B

📈 *CHECK RESULTS:*
${prefix}poll results ${pollId}

💡 *Share this poll ID (#${pollId}) with others to vote!*`;

                await reply(pollDisplay);
                
                console.log(`✅ Poll #${pollId} created: "${question}"`);
            }
            
            // ==================== VOTE IN POLL ====================
            else if (action === 'vote') {
                const pollId = parseInt(args[1]);
                const option = args[2]?.toUpperCase();
                
                if (!pollId) {
                    return await reply(`❌ Please specify a poll ID.\n\nExample: ${prefix}poll vote 1 A\n\nUse ${prefix}poll list to see available polls.`);
                }
                
                if (!option || !/^[A-Z]$/.test(option)) {
                    return await reply(`❌ Please specify a valid option letter (A-Z).\n\nExample: ${prefix}poll vote ${pollId} A`);
                }
                
                const poll = activePolls.get(pollId);
                if (!poll) {
                    return await reply(`❌ Poll #${pollId} not found.\n\nUse ${prefix}poll list to see active polls.`);
                }
                
                if (poll.ended) {
                    return await reply(`❌ Poll #${pollId} has ended.\n\nUse ${prefix}poll results ${pollId} to see final results.`);
                }
                
                const optionIndex = option.charCodeAt(0) - 65;
                if (optionIndex < 0 || optionIndex >= poll.options.length) {
                    return await reply(`❌ Invalid option. Poll #${pollId} has options A-${String.fromCharCode(65 + poll.options.length - 1)}`);
                }
                
                // Record vote
                const voteKey = `${pollId}_${sender}`;
                const previousVote = userVotes.get(voteKey);
                
                userVotes.set(voteKey, optionIndex);
                
                // Update vote counts
                if (previousVote !== undefined && previousVote !== optionIndex) {
                    poll.votes[previousVote] = Math.max(0, poll.votes[previousVote] - 1);
                    await m.react('🔄'); // React to show vote changed
                } else {
                    await m.react('✅'); // React to show vote recorded
                }
                
                poll.votes[optionIndex] = (poll.votes[optionIndex] || 0) + 1;
                poll.voters.add(sender);
                
                const voteConfirmation = `
🗳️ *VOTE RECORDED!*

✅ You voted for: *${poll.options[optionIndex]}*
📊 Poll: *${poll.question}*
🔢 Poll ID: #${pollId}
👤 Voter: @${senderId}
⏰ Time: ${new Date().toLocaleString()}

${previousVote !== undefined && previousVote !== optionIndex ? 
`🔄 *Vote Changed:* ${poll.options[previousVote]} → ${poll.options[optionIndex]}` : 
'🌟 *First Vote!* Thanks for participating!'}

📈 *Check Results:*
${prefix}poll results ${pollId}

💡 *Share with friends:* ${prefix}poll vote ${pollId} <letter>`;
                
                await reply(voteConfirmation);
            }
            
            // ==================== SHOW RESULTS ====================
            else if (action === 'results' || action === 'votes') {
                const pollId = parseInt(args[1]);
                
                if (!pollId) {
                    return await reply(`❌ Please specify a poll ID.\n\nExample: ${prefix}poll results 1\n\nUse ${prefix}poll list to see available polls.`);
                }
                
                const poll = activePolls.get(pollId);
                if (!poll) {
                    return await reply(`❌ Poll #${pollId} not found.\n\nUse ${prefix}poll list to see active polls.`);
                }
                
                // Calculate statistics
                const totalVotes = poll.votes.reduce((sum, count) => sum + count, 0);
                const totalVoters = poll.voters.size;
                
                // Create results with percentages and bars
                const results = poll.options.map((option, index) => {
                    const votes = poll.votes[index] || 0;
                    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const barLength = Math.round(percentage / 5); // 5% per character
                    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
                    
                    return {
                        option,
                        votes,
                        percentage,
                        bar,
                        letter: String.fromCharCode(65 + index),
                        isLeading: votes === Math.max(...poll.votes) && votes > 0
                    };
                });
                
                // Sort by votes (descending)
                results.sort((a, b) => b.votes - a.votes);
                
                // Find winner(s) - there could be ties
                const maxVotes = Math.max(...poll.votes);
                const winners = results.filter(r => r.votes === maxVotes && r.votes > 0);
                
                const resultsText = `
📈 *POLL RESULTS: #${pollId}*

📝 *Question:* ${poll.question}
📊 *Total Votes:* ${totalVotes} (${totalVoters} voters)
${poll.ended ? '🔚 *Status:* ENDED' : '🟢 *Status:* ACTIVE'}
👤 *Creator:* @${poll.creator.split('@')[0]}
⏰ *Created:* ${new Date(poll.createdAt).toLocaleString()}
${poll.ended ? `⏰ *Ended:* ${new Date(poll.endedAt).toLocaleString()}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *RESULTS:*
${results.map(r => 
`${r.isLeading ? '🏆 ' : ''}${r.letter}) ${r.option}
${r.bar} ${r.percentage}% (${r.votes} votes)`
).join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${winners.length > 0 ? 
`${winners.length === 1 ? '🎉 *WINNER:*' : '🎉 *WINNERS (TIE):*'}
${winners.map(w => `• ${w.letter}) ${w.option}`).join('\n')}\n` : 
'📊 *No votes yet! Be the first to vote!*'}

🗳️ *Vote Command:* ${prefix}poll vote ${pollId} <letter>
${!poll.ended ? `📢 *Share:* ${prefix}poll vote ${pollId} <letter>` : '🔒 *Poll has ended*'}`;
                
                await reply(resultsText);
            }
            
            // ==================== LIST ACTIVE POLLS ====================
            else if (action === 'list' || action === 'active') {
                const activePollList = Array.from(activePolls.entries())
                    .filter(([id, poll]) => !poll.ended && poll.chatId === from)
                    .map(([id, poll]) => {
                        const totalVotes = poll.votes.reduce((sum, count) => sum + count, 0);
                        return `#${id}: ${poll.question} (${poll.options.length} options, ${totalVotes} votes)`;
                    });
                
                if (activePollList.length === 0) {
                    return await reply(`📋 *No Active Polls in This Chat*\n\nCreate one with: ${prefix}poll create "Question" "Option1" "Option2"`);
                }
                
                await reply(`📋 *ACTIVE POLLS IN THIS CHAT:*\n\n${activePollList.join('\n')}\n\n🗳️ *Vote:* ${prefix}poll vote <poll-id> <letter>\n📈 *Results:* ${prefix}poll results <poll-id>`);
            }
            
            // ==================== END POLL ====================
            else if (action === 'end' || action === 'stop') {
                const pollId = parseInt(args[1]);
                
                if (!pollId) {
                    return await reply(`❌ Please specify a poll ID.\n\nExample: ${prefix}poll end 1`);
                }
                
                const poll = activePolls.get(pollId);
                if (!poll) {
                    return await reply(`❌ Poll #${pollId} not found.`);
                }
                
                // Check permissions
                if (sender !== poll.creator && !isAdmins && !isCreator) {
                    return await reply(`❌ Only @${poll.creator.split('@')[0]} (creator) or group admins can end this poll.`);
                }
                
                poll.ended = true;
                poll.endedAt = Date.now();
                
                await reply(`✅ *POLL #${pollId} ENDED*\n\n📝 *Question:* ${poll.question}\n👤 *Ended by:* @${senderId}\n⏰ *Ended at:* ${new Date().toLocaleString()}\n\n📈 *Final Results:* ${prefix}poll results ${pollId}`);
            }
            
            // ==================== SHOW USER VOTES ====================
            else if (action === 'myvotes' || action === 'my') {
                const userPollList = Array.from(activePolls.entries())
                    .filter(([id, poll]) => poll.chatId === from)
                    .map(([id, poll]) => {
                        const voteKey = `${id}_${sender}`;
                        const voteIndex = userVotes.get(voteKey);
                        
                        if (voteIndex !== undefined) {
                            return `#${id}: ${poll.question}\n   Your vote: ${poll.options[voteIndex]} (${String.fromCharCode(65 + voteIndex)})`;
                        }
                        return null;
                    })
                    .filter(item => item !== null);
                
                if (userPollList.length === 0) {
                    return await reply(`🗳️ *No Votes Found*\n\nYou haven't voted in any polls in this chat.\n\nUse ${prefix}poll list to see available polls.`);
                }
                
                await reply(`🗳️ *YOUR VOTES IN THIS CHAT:*\n\n${userPollList.join('\n\n')}`);
            }
            
            // ==================== MULTIPLE CHOICE VOTE ====================
            else if (action === 'multi' || action === 'multiple') {
                await reply(`🔢 *Multiple Choice Polls*\n\nFor multiple choice, create separate polls or use:\n${prefix}poll create "Select ALL that apply" "Option1" "Option2" "Option3"\n\nUsers can vote for multiple options by voting in separate polls.\n\n💡 *Pro tip:* Create a series of yes/no polls for each option!`);
            }
            
            // ==================== SHOW POLL INFO ====================
            else if (action === 'info' || action === 'about') {
                const pollId = parseInt(args[1]);
                
                if (!pollId) {
                    return await reply(`❌ Please specify a poll ID.\n\nExample: ${prefix}poll info 1`);
                }
                
                const poll = activePolls.get(pollId);
                if (!poll) {
                    return await reply(`❌ Poll #${pollId} not found.`);
                }
                
                const totalVotes = poll.votes.reduce((sum, count) => sum + count, 0);
                
                const infoText = `
📋 *POLL INFO: #${pollId}*

📝 *Question:* ${poll.question}
📊 *Total Votes:* ${totalVotes}
👥 *Voters:* ${poll.voters.size}
🔢 *Options:* ${poll.options.length}
${poll.ended ? '🔚 *Status:* ENDED' : '🟢 *Status:* ACTIVE'}
👤 *Creator:* @${poll.creator.split('@')[0]}
⏰ *Created:* ${new Date(poll.createdAt).toLocaleString()}
📍 *Chat:* ${isGroup ? 'Group' : 'Private'}

📋 *Options:*
${poll.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('\n')}

📌 *Commands:*
${prefix}poll vote ${pollId} <letter> - Vote
${prefix}poll results ${pollId} - See results
${!poll.ended ? `${prefix}poll end ${pollId} - End poll (creator/admin)` : ''}`;
                
                await reply(infoText);
            }
            
            // ==================== CLEAR ALL POLLS (ADMIN ONLY) ====================
            else if (action === 'clear' || action === 'reset') {
                if (!isAdmins && !isCreator) {
                    return await reply(`❌ Only group admins can clear all polls.`);
                }
                
                const chatPolls = Array.from(activePolls.entries())
                    .filter(([id, poll]) => poll.chatId === from);
                
                if (chatPolls.length === 0) {
                    return await reply(`📭 No polls to clear in this chat.`);
                }
                
                // Remove polls from this chat
                chatPolls.forEach(([id, poll]) => {
                    activePolls.delete(id);
                });
                
                await reply(`✅ Cleared ${chatPolls.length} poll(s) from this chat.\n\nAll polls and votes have been removed.`);
            }
            
            // ==================== INVALID COMMAND ====================
            else {
                return await reply(`❌ Invalid poll command: *${action}*\n\nUse ${prefix}poll help to see all available commands.\n\nQuick examples:\n${prefix}poll create "Question" "A" "B" "C"\n${prefix}poll vote 1 A\n${prefix}poll results 1\n${prefix}poll list`);
            }
            
        } catch (error) {
            console.error('❌ Poll command error:', error);
            
            const errorMessage = `
❌ *POLL ERROR*

⚠️ *What went wrong:*
${error.message || 'Unknown error'}

🔧 *Troubleshooting:*
• Check poll ID is correct
• Ensure option letter is valid (A, B, C, etc.)
• Make sure poll hasn't ended
• Try simple format: ${process.env.PREFIX || '.'}poll vote 1 A

📞 *Need help?* Contact admin or use ${process.env.PREFIX || '.'}poll help`;

            await reply(errorMessage);
        }
    }
};
const fs = require('fs');
const path = require('path');

// Track active polls and votes
const activePolls = new Map();
const userVotes = new Map();

module.exports = {
    name: 'pollvote',
    pattern: 'pollvote',
    description: 'Vote in a poll or check poll results',
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
🗳️ *POLL VOTING SYSTEM*

Vote in active polls or check results.

📌 *Usage:*
${prefix}pollvote <poll-id> <option-letter> - Vote in a poll
${prefix}pollvote results <poll-id> - Show poll results
${prefix}pollvote list - List active polls
${prefix}pollvote myvotes - Show your votes

📌 *Examples:*
${prefix}pollvote 1 A - Vote for option A in poll #1
${prefix}pollvote results 1 - Show results for poll #1
${prefix}pollvote list - List all active polls

📌 *Voting Rules:*
• One vote per user per poll
• Can change vote until poll ends
• Anonymous voting (admin can see voter list)
• Real-time result updates

💡 *Tip:* Use ${prefix}poll create to make new polls!`;
                
                return await reply(helpText);
            }

            const action = args[0].toLowerCase();

            // Vote in a poll
            if (/^\d+$/.test(action)) {
                const pollId = parseInt(action);
                const option = args[1]?.toUpperCase();
                
                if (!option || !/^[A-Z]$/.test(option)) {
                    return await reply(`❌ Please specify a valid option letter (A-Z).\n\nExample: ${prefix}pollvote ${pollId} A`);
                }
                
                const poll = activePolls.get(pollId);
                if (!poll) {
                    return await reply(`❌ Poll #${pollId} not found.\n\nUse ${prefix}pollvote list to see active polls.`);
                }
                
                // Check if poll is still active
                if (poll.ended) {
                    return await reply(`❌ Poll #${pollId} has ended.\n\nFinal results are available with ${prefix}pollvote results ${pollId}`);
                }
                
                const optionIndex = option.charCodeAt(0) - 65;
                if (optionIndex < 0 || optionIndex >= poll.options.length) {
                    return await reply(`❌ Invalid option. Poll #${pollId} has options A-${String.fromCharCode(65 + poll.options.length - 1)}`);
                }
                
                // Record vote
                const voteKey = `${pollId}_${sender}`;
                const previousVote = userVotes.get(voteKey);
                
                userVotes.set(voteKey, optionIndex);
                
                // Update poll vote count
                if (previousVote !== undefined && previousVote !== optionIndex) {
                    poll.votes[previousVote] = Math.max(0, poll.votes[previousVote] - 1);
                }
                poll.votes[optionIndex] = (poll.votes[optionIndex] || 0) + 1;
                
                await reply(`✅ Vote recorded!\n\n🗳️ You voted for: *${poll.options[optionIndex]}*\n📊 Poll: *${poll.question}*\n👤 Voter: @${senderId}\n⏰ Time: ${new Date().toLocaleString()}`);
                
            } 
            // Show poll results
            else if (action === 'results' || action === 'votes') {
                const pollId = parseInt(args[1]);
                
                if (!pollId) {
                    return await reply(`❌ Please specify a poll ID.\n\nExample: ${prefix}pollvote results 1`);
                }
                
                const poll = activePolls.get(pollId);
                if (!poll) {
                    return await reply(`❌ Poll #${pollId} not found.`);
                }
                
                // Calculate percentages
                const totalVotes = poll.votes.reduce((sum, count) => sum + count, 0);
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
                        letter: String.fromCharCode(65 + index)
                    };
                });
                
                // Sort by votes (descending)
                results.sort((a, b) => b.votes - a.votes);
                
                const resultsText = `
📈 *Poll Results: #${pollId}*

📝 *Question:* ${poll.question}
📊 *Total Votes:* ${totalVotes}
${poll.ended ? '🔚 *Status:* Ended' : '🟢 *Status:* Active'}
👤 *Creator:* @${poll.creator.split('@')[0]}
⏰ *Created:* ${new Date(poll.createdAt).toLocaleString()}
${poll.ended ? `⏰ *Ended:* ${new Date(poll.endedAt).toLocaleString()}` : ''}

━━━━━━━━━━━━━━━━━━━━━━
📋 *RESULTS:*
${results.map(r => `${r.letter}) ${r.option}\n${r.bar} ${r.percentage}% (${r.votes} votes)`).join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━

${poll.ended ? '🔒 *Poll has ended. No more votes accepted.*' : '🗳️ *Vote with:* ' + prefix + 'pollvote ' + pollId + ' <letter>'}`;
                
                await reply(resultsText);
                
            }
            // List active polls
            else if (action === 'list' || action === 'active') {
                const activePollList = Array.from(activePolls.entries())
                    .filter(([id, poll]) => !poll.ended)
                    .map(([id, poll]) => `#${id}: ${poll.question} (${poll.options.length} options, ${poll.votes.reduce((s, c) => s + c, 0)} votes)`);
                
                if (activePollList.length === 0) {
                    return await reply(`📋 *No Active Polls*\n\nUse ${prefix}poll create to start a new poll!`);
                }
                
                await reply(`📋 *Active Polls:*\n\n${activePollList.join('\n')}\n\n🗳️ *Vote with:* ${prefix}pollvote <poll-id> <option-letter>`);
            }
            // Show user's votes
            else if (action === 'myvotes' || action === 'my') {
                const userVoteList = [];
                
                for (const [pollId, poll] of activePolls.entries()) {
                    const voteKey = `${pollId}_${sender}`;
                    const voteIndex = userVotes.get(voteKey);
                    
                    if (voteIndex !== undefined) {
                        userVoteList.push(`#${pollId}: ${poll.question}\n   Your vote: ${poll.options[voteIndex]} (${String.fromCharCode(65 + voteIndex)})`);
                    }
                }
                
                if (userVoteList.length === 0) {
                    return await reply(`🗳️ *No Votes Found*\n\nYou haven't voted in any active polls.\n\nUse ${prefix}pollvote list to see available polls.`);
                }
                
                await reply(`🗳️ *Your Votes:*\n\n${userVoteList.join('\n\n')}`);
            }
            // End a poll (admin/creator only)
            else if (action === 'end' || action === 'stop') {
                const pollId = parseInt(args[1]);
                
                if (!pollId) {
                    return await reply(`❌ Please specify a poll ID.\n\nExample: ${prefix}pollvote end 1`);
                }
                
                const poll = activePolls.get(pollId);
                if (!poll) {
                    return await reply(`❌ Poll #${pollId} not found.`);
                }
                
                // Check permission
                if (sender !== poll.creator && !isAdmins && !isCreator) {
                    return await reply(`❌ Only the poll creator (@${poll.creator.split('@')[0]}) or group admins can end this poll.`);
                }
                
                poll.ended = true;
                poll.endedAt = Date.now();
                
                await reply(`✅ Poll #${pollId} ended successfully!\n\nUse ${prefix}pollvote results ${pollId} to see final results.`);
            }
            // Invalid action
            else {
                return await reply(`❌ Invalid pollvote command: ${action}\n\nUse ${prefix}pollvote help to see available commands.`);
            }
            
        } catch (error) {
            console.error('❌ Pollvote command error:', error);
            await reply(`❌ Error processing poll vote: ${error.message}\n\nUse ${prefix}pollvote help for assistance.`);
        }
    }
};
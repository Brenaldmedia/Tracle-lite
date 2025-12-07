module.exports = {
    pattern: 'rps',
    alias: ['rockpaperscissors', 'bigbang'],
    description: 'Play Rock Paper Scissors Lizard Spock - The Big Bang Theory version',
    category: 'games',
    execute: async (conn, message, m, { args, reply, from, isGroup, groupMetadata, sessionId }) => {
        try {
            if (!isGroup) {
                return await reply(`❌ This game can only be played in groups!`);
            }

            const prefix = require('../server').PREFIX;
            
            // Game state storage
            if (!global.rpsGames) {
                global.rpsGames = new Map();
            }

            const gameId = from;

            if (args.length === 0) {
                return await reply(
                    `🎮 *ROCK PAPER SCISSORS LIZARD SPOCK* 🎮\n\n*The Big Bang Theory Version!*\n\n` +
                    `*Commands:*\n• ${prefix}rps challenge @user - Challenge someone\n• ${prefix}rps accept - Accept challenge\n• ${prefix}rps play [choice] - Make your move\n• ${prefix}rps rules - Show game rules\n• ${prefix}rps cancel - Cancel current game\n\n` +
                    `*Choices:*\n🪨 Rock | 📄 Paper | ✂️ Scissors | 🦎 Lizard | 🖖 Spock\n\n` +
                    `🔥 *Bazinga! Let's play!*`
                );
            }

            const action = args[0].toLowerCase();

            switch (action) {
                case 'challenge':
                case 'chall':
                case 'duel':
                    return await challengePlayer(conn, message, m, reply, gameId, from, args);
                
                case 'accept':
                case 'yes':
                    return await acceptChallenge(conn, message, m, reply, gameId, from);
                
                case 'play':
                case 'move':
                case 'choice':
                    return await makeChoice(conn, message, m, reply, gameId, from, args);
                
                case 'rules':
                case 'help':
                    return await showRules(conn, message, m, reply, gameId, from);
                
                case 'cancel':
                case 'stop':
                case 'end':
                    return await cancelGame(conn, message, m, reply, gameId, from);
                
                default:
                    return await reply(`❌ Invalid command. Use ${prefix}rps for help.`);
            }
        } catch (error) {
            console.error('Error in rps command:', error);
            await reply('❌ Error starting RPS game');
        }
    }
};

// Challenge another player
async function challengePlayer(conn, message, m, reply, gameId, from, args) {
    const existingGame = global.rpsGames.get(gameId);
    
    if (existingGame) {
        return await reply(`🎮 There's already a game in progress! Wait for it to finish or use ${require('../server').PREFIX}rps cancel`);
    }

    const challenger = m.sender;
    
    // Check if user mentioned someone
    let opponent = m.mentionedJid ? m.mentionedJid[0] : null;
    
    // If user replied to someone
    if (!opponent && m.quoted) {
        opponent = m.quoted.sender;
    }

    if (!opponent) {
        return await reply(`❌ Please mention or reply to someone to challenge!\nExample: ${require('../server').PREFIX}rps challenge @user`);
    }

    if (opponent === challenger) {
        return await reply(`❌ You can't challenge yourself! That's just sad...`);
    }

    if (opponent === conn.user.id) {
        return await reply(`🤖 I'm just a bot! Challenge a real human instead.`);
    }

    const newGame = {
        challenger: challenger,
        opponent: opponent,
        status: 'challenged',
        choices: {},
        startTime: Date.now(),
        round: 1,
        scores: { [challenger]: 0, [opponent]: 0 }
    };

    global.rpsGames.set(gameId, newGame);

    // Send challenge with fun Big Bang theme
    await conn.sendMessage(from, {
        text: `🎮 *CHALLENGE ISSUED!* 🎮\n\n` +
              `⚡ *Challenger:* @${challenger.split('@')[0]}\n` +
              `🎯 *Opponent:* @${opponent.split('@')[0]}\n\n` +
              `🔬 *The Big Bang Theory Duel!*\n` +
              `🪨 Rock | 📄 Paper | ✂️ Scissors | 🦎 Lizard | 🖖 Spock\n\n` +
              `@${opponent.split('@')[0]}, type *${require('../server').PREFIX}rps accept* to accept the challenge!\n` +
              `⏰ Challenge expires in 2 minutes\n\n` +
              `🔥 *Bazinga!*`,
        mentions: [challenger, opponent]
    }, { quoted: message });

    // Set timeout to auto-cancel challenge
    setTimeout(() => {
        const currentGame = global.rpsGames.get(gameId);
        if (currentGame && currentGame.status === 'challenged') {
            global.rpsGames.delete(gameId);
            conn.sendMessage(from, {
                text: `⏰ *CHALLENGE EXPIRED!*\n\n@${opponent.split('@')[0]} didn't respond in time!\nChallenge from @${challenger.split('@')[0]} has been cancelled.`,
                mentions: [challenger, opponent]
            });
        }
    }, 120000);
}

// Accept challenge
async function acceptChallenge(conn, message, m, reply, gameId, from) {
    const game = global.rpsGames.get(gameId);
    
    if (!game) {
        return await reply(`❌ No active challenge found. Start one with ${require('../server').PREFIX}rps challenge @user`);
    }

    const accepter = m.sender;
    
    if (accepter !== game.opponent) {
        return await reply(`❌ This challenge isn't for you! Wait for your own challenge.`);
    }

    if (game.status !== 'challenged') {
        return await reply(`❌ This challenge has already been accepted or expired.`);
    }

    game.status = 'active';
    game.startTime = Date.now();

    await conn.sendMessage(from, {
        text: `🎮 *CHALLENGE ACCEPTED!* 🎮\n\n` +
              `⚔️ *Duelists:*\n` +
              `• @${game.challenger.split('@')[0]} 👨‍🔬\n` +
              `• @${game.opponent.split('@')[0]} 👨‍🔬\n\n` +
              `🎯 *Best of 3 Rounds!*\n\n` +
              `@${game.challenger.split('@')[0]}, make your move first!\n` +
              `Type: *${require('../server').PREFIX}rps play [choice]*\n\n` +
              `*Available Choices:*\n` +
              `🪨 rock | 📄 paper | ✂️ scissors | 🦎 lizard | 🖖 spock\n\n` +
              `🔥 *Let the geek battle begin!*`,
        mentions: [game.challenger, game.opponent]
    }, { quoted: message });
}

// Make choice
async function makeChoice(conn, message, m, reply, gameId, from, args) {
    const game = global.rpsGames.get(gameId);
    
    if (!game) {
        return await reply(`❌ No active game found. Start one with ${require('../server').PREFIX}rps challenge @user`);
    }

    if (game.status !== 'active') {
        return await reply(`❌ Game not active. Wait for challenge to be accepted.`);
    }

    const player = m.sender;
    
    if (![game.challenger, game.opponent].includes(player)) {
        return await reply(`❌ You're not in this game! Wait for your turn.`);
    }

    if (args.length < 2) {
        return await reply(`❌ Please specify your choice!\nExample: ${require('../server').PREFIX}rps play rock\n\n*Choices:* 🪨 rock | 📄 paper | ✂️ scissors | 🦎 lizard | 🖖 spock`);
    }

    const choice = args[1].toLowerCase();
    const validChoices = ['rock', 'paper', 'scissors', 'lizard', 'spock', '🪨', '📄', '✂️', '🦎', '🖖'];
    
    if (!validChoices.includes(choice)) {
        return await reply(`❌ Invalid choice! Use: rock, paper, scissors, lizard, or spock\n\n*Emojis also work:* 🪨 📄 ✂️ 🦎 🖖`);
    }

    // Convert emoji to text
    const choiceMap = {
        '🪨': 'rock', 'rock': 'rock',
        '📄': 'paper', 'paper': 'paper', 
        '✂️': 'scissors', 'scissors': 'scissors',
        '🦎': 'lizard', 'lizard': 'lizard',
        '🖖': 'spock', 'spock': 'spock'
    };

    const finalChoice = choiceMap[choice];
    game.choices[player] = finalChoice;

    const emojiMap = {
        'rock': '🪨',
        'paper': '📄', 
        'scissors': '✂️',
        'lizard': '🦎',
        'spock': '🖖'
    };

    // Check if both players have made choices
    const players = [game.challenger, game.opponent];
    const bothChosen = players.every(p => game.choices[p]);

    if (!bothChosen) {
        // Wait for other player
        const waitingFor = players.find(p => !game.choices[p] && p !== player);
        
        await conn.sendMessage(from, {
            text: `🎮 *CHOICE RECEIVED!* 🎮\n\n` +
                  `@${player.split('@')[0]} chose: ${emojiMap[finalChoice]} *${finalChoice.toUpperCase()}*\n\n` +
                  `⏳ Waiting for @${waitingFor.split('@')[0]} to make a choice...`,
            mentions: [player, waitingFor]
        }, { quoted: message });
        
        return;
    }

    // Both players have chosen - determine winner
    const [choice1, choice2] = [game.choices[game.challenger], game.choices[game.opponent]];
    const result = determineWinner(choice1, choice2);
    
    let roundResult = '';
    let winner = null;

    if (result === 'draw') {
        roundResult = `⚖️ *ROUND ${game.round} - DRAW!*\n\n` +
                     `@${game.challenger.split('@')[0]}: ${emojiMap[choice1]} ${choice1}\n` +
                     `@${game.opponent.split('@')[0]}: ${emojiMap[choice2]} ${choice2}\n\n` +
                     `🤝 *It's a tie!* No points awarded.`;
    } else {
        winner = result === 'player1' ? game.challenger : game.opponent;
        const loser = result === 'player1' ? game.opponent : game.challenger;
        
        game.scores[winner]++;
        const winExplanation = getWinExplanation(choice1, choice2, result);
        
        roundResult = `🎉 *ROUND ${game.round} - @${winner.split('@')[0]} WINS!*\n\n` +
                     `@${game.challenger.split('@')[0]}: ${emojiMap[choice1]} ${choice1}\n` +
                     `@${game.opponent.split('@')[0]}: ${emojiMap[choice2]} ${choice2}\n\n` +
                     `💡 *${winExplanation}*\n\n` +
                     `📊 *Scores:*\n` +
                     `@${game.challenger.split('@')[0]}: ${game.scores[game.challenger]}\n` +
                     `@${game.opponent.split('@')[0]}: ${game.scores[game.opponent]}`;
    }

    // Check if game is over
    const maxScore = 2; // Best of 3
    const gameWinner = Object.entries(game.scores).find(([_, score]) => score >= maxScore);
    
    if (gameWinner) {
        // Game over
        const winnerJid = gameWinner[0];
        const winnerName = winnerJid === game.challenger ? 
            `@${game.challenger.split('@')[0]}` : `@${game.opponent.split('@')[0]}`;
        
        const gameDuration = Math.round((Date.now() - game.startTime) / 1000);
        
        // Big Bang Theory victory quotes
        const victoryQuotes = [
            "🔥 Bazinga!",
            "🎯 Soft Kitty, Warm Kitty, Little Ball of Fur!",
            "👓 That's my spot!",
            "⚛️ The physics is theoretical, but the fun is real!",
            "🎮 That's a knockout!",
            "🌟 You're the master of your domain!",
            "💫 That's how we roll in apartment 4A!"
        ];
        
        const randomQuote = victoryQuotes[Math.floor(Math.random() * victoryQuotes.length)];
        
        await conn.sendMessage(from, {
            text: `🎮 *GAME OVER!* 🎮\n\n` +
                  `${roundResult}\n\n` +
                  `🏆 *FINAL WINNER:* ${winnerName}\n` +
                  `⏱️ *Duration:* ${gameDuration}s\n` +
                  `🎯 *Final Score:* ${game.scores[game.challenger]} - ${game.scores[game.opponent]}\n\n` +
                  `${randomQuote}\n\n` +
                  `💫 Start a new game with ${require('../server').PREFIX}rps challenge @user`,
            mentions: [game.challenger, game.opponent]
        }, { quoted: message });
        
        global.rpsGames.delete(gameId);
    } else {
        // Continue to next round
        game.round++;
        game.choices = {}; // Reset choices for next round
        
        await conn.sendMessage(from, {
            text: `${roundResult}\n\n` +
                  `🎮 *ROUND ${game.round} - MAKE YOUR CHOICES!*\n\n` +
                  `@${game.challenger.split('@')[0]} & @${game.opponent.split('@')[0]}, make your moves!\n` +
                  `Type: *${require('../server').PREFIX}rps play [choice]*\n\n` +
                  `*First to 2 points wins!*`,
            mentions: [game.challenger, game.opponent]
        }, { quoted: message });
    }
}

// Show rules
async function showRules(conn, message, m, reply, gameId, from) {
    await reply(
        `🎮 *RPS RULES - The Big Bang Theory* 🎮\n\n` +
        `*Scissors cuts Paper\nPaper covers Rock\nRock crushes Lizard\nLizard poisons Spock\nSpock smashes Scissors\nScissors decapitates Lizard\nLizard eats Paper\nPaper disproves Spock\nSpock vaporizes Rock\nRock crushes Scissors*\n\n` +
        `*How to Play:*\n1. Challenge someone: .rps challenge @user\n2. They accept: .rps accept\n3. Make moves: .rps play [choice]\n4. Best of 3 rounds wins!\n\n` +
        `*Available Choices:*\n🪨 rock | 📄 paper | ✂️ scissors | 🦎 lizard | 🖖 spock\n\n` +
        `🔥 *Bazinga! Have fun!*`
    );
}

// Cancel game
async function cancelGame(conn, message, m, reply, gameId, from) {
    const game = global.rpsGames.get(gameId);
    
    if (!game) {
        return await reply(`❌ No active game to cancel.`);
    }

    const canceller = m.sender;
    
    if (![game.challenger, game.opponent].includes(canceller)) {
        return await reply(`❌ Only players can cancel the game.`);
    }

    global.rpsGames.delete(gameId);
    
    await conn.sendMessage(from, {
        text: `🎮 *GAME CANCELLED* 🎮\n\n` +
              `👤 Cancelled by: @${canceller.split('@')[0]}\n` +
              `⏱️ Game duration: ${Math.round((Date.now() - game.startTime) / 1000)}s\n\n` +
              `💫 Start a new game with ${require('../server').PREFIX}rps challenge @user`,
        mentions: [canceller]
    }, { quoted: message });
}

// Determine winner
function determineWinner(choice1, choice2) {
    if (choice1 === choice2) return 'draw';
    
    const rules = {
        'rock': ['scissors', 'lizard'],
        'paper': ['rock', 'spock'], 
        'scissors': ['paper', 'lizard'],
        'lizard': ['paper', 'spock'],
        'spock': ['rock', 'scissors']
    };
    
    if (rules[choice1].includes(choice2)) return 'player1';
    if (rules[choice2].includes(choice1)) return 'player2';
    
    return 'draw';
}

// Get fun Big Bang Theory explanation
function getWinExplanation(choice1, choice2, result) {
    const explanations = {
        'rock-scissors': 'Rock crushes Scissors!',
        'rock-lizard': 'Rock crushes Lizard!', 
        'paper-rock': 'Paper covers Rock!',
        'paper-spock': 'Paper disproves Spock!',
        'scissors-paper': 'Scissors cuts Paper!',
        'scissors-lizard': 'Scissors decapitates Lizard!',
        'lizard-paper': 'Lizard eats Paper!',
        'lizard-spock': 'Lizard poisons Spock!',
        'spock-rock': 'Spock vaporizes Rock!',
        'spock-scissors': 'Spock smashes Scissors!'
    };
    
    const key = result === 'player1' ? `${choice1}-${choice2}` : `${choice2}-${choice1}`;
    return explanations[key] || 'Victory!';
}
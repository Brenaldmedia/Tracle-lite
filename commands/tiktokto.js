module.exports = {
    pattern: 'tiktokto',
    alias: ['ttt', 'tiktokgame'],
    description: 'Play TikTok-themed Tic Tac Toe game in groups',
    category: 'games',
    execute: async (conn, message, m, { args, reply, from, isGroup, groupMetadata, sessionId }) => {
        try {
            if (!isGroup) {
                return await reply(`❌ This game can only be played in groups!`);
            }

            const prefix = require('../server').PREFIX;
            
            // Game state storage
            if (!global.tiktoktoGames) {
                global.tiktoktoGames = new Map();
            }

            const gameId = from; // Use group JID as game ID

            if (args.length === 0) {
                return await reply(
                    `🎮 *TIKTOK TOE GAME* 🎮\n\nA fun TikTok-themed Tic Tac Toe game!\n\n*Commands:*\n• ${prefix}tiktokto start - Start a new game\n• ${prefix}tiktokto join - Join the current game\n• ${prefix}tiktokto move [1-9] - Make a move\n• ${prefix}tiktokto board - Show current board\n• ${prefix}tiktokto end - End current game\n\n*How to Play:*\nUse numbers 1-9 to make moves:\n1 2 3\n4 5 6\n7 8 9\n\n🎵 TikTok emojis: ❤️=Player1, 🎵=Player2`
                );
            }

            const action = args[0].toLowerCase();

            switch (action) {
                case 'start':
                case 'new':
                case 'create':
                    return await startGame(conn, message, m, reply, gameId, from);
                
                case 'join':
                    return await joinGame(conn, message, m, reply, gameId, from);
                
                case 'move':
                case 'play':
                    return await makeMove(conn, message, m, reply, gameId, from, args);
                
                case 'board':
                case 'status':
                case 'show':
                    return await showBoard(conn, message, m, reply, gameId, from);
                
                case 'end':
                case 'stop':
                case 'quit':
                    return await endGame(conn, message, m, reply, gameId, from);
                
                default:
                    return await reply(`❌ Invalid command. Use ${prefix}tiktokto for help.`);
            }
        } catch (error) {
            console.error('Error in tiktokto command:', error);
            await reply('❌ Error starting TikTok Toe game');
        }
    }
};

// Start a new game
async function startGame(conn, message, m, reply, gameId, from) {
    const existingGame = global.tiktoktoGames.get(gameId);
    
    if (existingGame) {
        return await reply(`🎮 There's already a game in progress! Use ${require('../server').PREFIX}tiktokto join to join or ${require('../server').PREFIX}tiktokto end to stop it.`);
    }

    const creator = m.sender;
    const creatorName = await getUserName(conn, creator, from);

    const newGame = {
        board: Array(9).fill('⬜'),
        players: [creator],
        playerNames: [creatorName],
        currentPlayer: 0,
        symbols: ['❤️', '🎵'],
        started: false,
        creator: creator,
        moves: 0,
        startTime: Date.now()
    };

    global.tiktoktoGames.set(gameId, newGame);

    const board = generateBoard(newGame.board);
    
    await conn.sendMessage(from, {
        text: `🎮 *TIKTOK TOE GAME STARTED!* 🎮\n\n` +
              `👤 *Creator:* @${creator.split('@')[0]}\n` +
              `🎵 *Waiting for player 2 to join...*\n\n` +
              `${board}\n\n` +
              `Type *${require('../server').PREFIX}tiktokto join* to join the game!\n` +
              `🎵 *Symbols:* ❤️ vs 🎵`,
        mentions: [creator]
    }, { quoted: message });
}

// Join an existing game
async function joinGame(conn, message, m, reply, gameId, from) {
    const game = global.tiktoktoGames.get(gameId);
    
    if (!game) {
        return await reply(`❌ No active game found. Start one with ${require('../server').PREFIX}tiktokto start`);
    }

    if (game.started) {
        return await reply(`❌ Game already in progress! Wait for it to finish.`);
    }

    const joiner = m.sender;
    
    if (game.players.includes(joiner)) {
        return await reply(`❌ You're already in the game!`);
    }

    if (game.players.length >= 2) {
        return await reply(`❌ Game is full! Only 2 players allowed.`);
    }

    const joinerName = await getUserName(conn, joiner, from);
    game.players.push(joiner);
    game.playerNames.push(joinerName);
    game.started = true;

    const board = generateBoard(game.board);
    
    await conn.sendMessage(from, {
        text: `🎮 *PLAYER JOINED!* 🎮\n\n` +
              `👥 *Players:*\n` +
              `❤️ @${game.players[0].split('@')[0]}\n` +
              `🎵 @${game.players[1].split('@')[0]}\n\n` +
              `${board}\n\n` +
              `🎵 *@${game.players[game.currentPlayer].split('@')[0]}*'s turn (${game.symbols[game.currentPlayer]})\n` +
              `Type *${require('../server').PREFIX}tiktokto move [1-9]* to play!\n\n` +
              `*Board Positions:*\n1 2 3\n4 5 6\n7 8 9`,
        mentions: [game.players[0], game.players[1]]
    }, { quoted: message });
}

// Make a move - FIXED: Proper user tagging in error messages
async function makeMove(conn, message, m, reply, gameId, from, args) {
    const game = global.tiktoktoGames.get(gameId);
    
    if (!game) {
        return await reply(`❌ No active game found. Start one with ${require('../server').PREFIX}tiktokto start`);
    }

    if (!game.started) {
        return await reply(`❌ Waiting for player 2 to join. Use ${require('../server').PREFIX}tiktokto join`);
    }

    const player = m.sender;
    const playerIndex = game.players.indexOf(player);
    
    if (playerIndex === -1) {
        return await reply(`❌ You're not in this game! Join with ${require('../server').PREFIX}tiktokto join`);
    }

    if (playerIndex !== game.currentPlayer) {
        // FIXED: Use proper mention format instead of just reply
        await conn.sendMessage(from, {
            text: `❌ It's not your turn! Wait for @${game.players[game.currentPlayer].split('@')[0]} to play.`,
            mentions: [game.players[game.currentPlayer]]
        }, { quoted: message });
        return;
    }

    if (args.length < 2) {
        return await reply(`❌ Please specify a position (1-9). Example: ${require('../server').PREFIX}tiktokto move 5`);
    }

    const position = parseInt(args[1]);
    
    if (isNaN(position) || position < 1 || position > 9) {
        return await reply(`❌ Invalid position! Use numbers 1-9 only.`);
    }

    const boardIndex = position - 1;
    
    if (game.board[boardIndex] !== '⬜') {
        return await reply(`❌ Position ${position} is already taken! Choose another spot.`);
    }

    // Make the move
    game.board[boardIndex] = game.symbols[playerIndex];
    game.moves++;
    game.currentPlayer = 1 - game.currentPlayer; // Switch player

    const board = generateBoard(game.board);
    const winner = checkWinner(game.board);
    const isDraw = game.moves === 9 && !winner;

    let resultMessage = '';
    let mentions = [game.players[0], game.players[1]];
    
    if (winner) {
        const winnerIndex = game.symbols.indexOf(winner);
        const gameDuration = Math.round((Date.now() - game.startTime) / 1000);
        
        resultMessage = `\n\n🎉 *GAME OVER!* 🎉\n🏆 *Winner:* @${game.players[winnerIndex].split('@')[0]} (${winner})\n⏱️ *Duration:* ${gameDuration}s\n🎵 *Moves:* ${game.moves}`;
        
        // Add some fun TikTok-themed victory messages
        const victoryMessages = [
            "🔥 That move went VIRAL!",
            "🎵 TikTok famous move!",
            "💫 That's trending material!",
            "🌟 Going straight to the For You Page!",
            "📱 That move got 1M likes!",
            "💃 Dance victory!",
            "🎶 Certified banger move!"
        ];
        
        const randomVictoryMsg = victoryMessages[Math.floor(Math.random() * victoryMessages.length)];
        resultMessage += `\n${randomVictoryMsg}`;
        
        global.tiktoktoGames.delete(gameId);
        
    } else if (isDraw) {
        const gameDuration = Math.round((Date.now() - game.startTime) / 1000);
        resultMessage = `\n\n🤝 *GAME OVER!* 🤝\n⚖️ *Result:* It's a draw!\n⏱️ *Duration:* ${gameDuration}s\n🎵 *Moves:* ${game.moves}\n\n🎵 Both players are TikTok famous now!`;
        global.tiktoktoGames.delete(gameId);
        
    } else {
        resultMessage = `\n\n🎵 *@${game.players[game.currentPlayer].split('@')[0]}*'s turn (${game.symbols[game.currentPlayer]})\nType *${require('../server').PREFIX}tiktokto move [1-9]*`;
    }

    await conn.sendMessage(from, {
        text: `🎮 *TIKTOK TOE MOVE* 🎮\n\n` +
              `👤 *Player:* @${player.split('@')[0]} (${game.symbols[playerIndex]})\n` +
              `📍 *Move:* Position ${position}\n\n` +
              `${board}` +
              `${resultMessage}`,
        mentions: mentions
    }, { quoted: message });
}

// Show current board
async function showBoard(conn, message, m, reply, gameId, from) {
    const game = global.tiktoktoGames.get(gameId);
    
    if (!game) {
        return await reply(`❌ No active game found. Start one with ${require('../server').PREFIX}tiktokto start`);
    }

    const board = generateBoard(game.board);
    let statusMessage = '';
    let mentions = [];
    
    if (!game.started) {
        statusMessage = `🎵 Waiting for player 2...\nType *${require('../server').PREFIX}tiktokto join* to play!`;
        mentions = [game.players[0]];
    } else {
        const winner = checkWinner(game.board);
        if (winner) {
            const winnerIndex = game.symbols.indexOf(winner);
            statusMessage = `🏆 Game Over! @${game.players[winnerIndex].split('@')[0]} wins! (${winner})`;
            mentions = [game.players[0], game.players[1]];
        } else if (game.moves === 9) {
            statusMessage = `🤝 Game Over! It's a draw!`;
            mentions = [game.players[0], game.players[1]];
        } else {
            statusMessage = `🎵 @${game.players[game.currentPlayer].split('@')[0]}'s turn (${game.symbols[game.currentPlayer]})`;
            mentions = [game.players[0], game.players[1]];
        }
    }

    await conn.sendMessage(from, {
        text: `🎮 *TIKTOK TOE BOARD* 🎮\n\n` +
              `👥 *Players:*\n` +
              `❤️ @${game.players[0].split('@')[0]}\n` +
              `${game.players[1] ? `🎵 @${game.players[1].split('@')[0]}` : '🎵 Waiting...'}\n\n` +
              `${board}\n\n` +
              `${statusMessage}\n\n` +
              `*Board Positions:*\n1 2 3\n4 5 6\n7 8 9`,
        mentions: mentions
    }, { quoted: message });
}

// End current game
async function endGame(conn, message, m, reply, gameId, from) {
    const game = global.tiktoktoGames.get(gameId);
    
    if (!game) {
        return await reply(`❌ No active game to end.`);
    }

    const ender = m.sender;
    
    // Only creator or players can end the game
    if (ender !== game.creator && !game.players.includes(ender)) {
        return await reply(`❌ Only game creator or players can end the game.`);
    }

    global.tiktoktoGames.delete(gameId);
    
    await conn.sendMessage(from, {
        text: `🎮 *TIKTOK TOE GAME ENDED* 🎮\n\n` +
              `👤 Ended by: @${ender.split('@')[0]}\n` +
              `🎵 Game duration: ${Math.round((Date.now() - game.startTime) / 1000)}s\n` +
              `📊 Total moves: ${game.moves}\n\n` +
              `💫 Thanks for playing! Start a new game with ${require('../server').PREFIX}tiktokto start`,
        mentions: [ender]
    }, { quoted: message });
}

// Helper function to generate board display
function generateBoard(board) {
    let boardDisplay = '';
    for (let i = 0; i < 9; i += 3) {
        boardDisplay += `${board[i]} ${board[i + 1]} ${board[i + 2]}\n`;
    }
    return boardDisplay;
}

// Helper function to check for winner
function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] !== '⬜' && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

// Helper function to get user name
async function getUserName(conn, jid, groupJid) {
    try {
        if (groupJid.endsWith('@g.us')) {
            const metadata = await conn.groupMetadata(groupJid);
            const participant = metadata.participants.find(p => p.id === jid);
            return participant?.notify || participant?.id.split('@')[0] || 'Player';
        }
    } catch (error) {
        console.error('Error getting user name:', error);
    }
    return jid.split('@')[0];
}
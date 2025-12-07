require('dotenv').config();
const express = require('express');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const socketIO = require('socket.io');
const pino = require('pino');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.static('public'));

const sessions = new Map();
const userConfigs = new Map();
const pairingTimeouts = new Map();

// Load commands dynamically
const commands = new Map();
loadCommands();

function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        commands.clear();
        
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        commandFiles.forEach(file => {
            try {
                delete require.cache[require.resolve(path.join(commandsPath, file))];
                const command = require(path.join(commandsPath, file));
                if (command.name) {
                    commands.set(command.name, command);
                    console.log(`✅ Loaded command: ${command.name}`);
                }
            } catch (error) {
                console.error(`❌ Error loading command ${file}:`, error);
            }
        });
    }
    console.log(`📦 Total commands loaded: ${commands.size}`);
}

setInterval(loadCommands, 30000);

// NEW: Auto-restore existing sessions on server start
async function restoreExistingSessions() {
    console.log('🔄 Checking for existing sessions...');
    
    const sessionsPath = path.join(__dirname, 'sessions');
    
    try {
        if (!await fs.pathExists(sessionsPath)) {
            console.log('📁 No sessions folder found');
            return;
        }
        
        const userFolders = await fs.readdir(sessionsPath);
        
        if (userFolders.length === 0) {
            console.log('📁 No existing sessions to restore');
            return;
        }
        
        console.log(`📦 Found ${userFolders.length} session(s) to restore`);
        
        for (const userNumber of userFolders) {
            const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
            
            // Check if this session has valid credentials
            if (await fs.pathExists(credsPath)) {
                try {
                    const creds = await fs.readJson(credsPath);
                    
                    // Only restore if session was previously registered
                    if (creds.registered) {
                        console.log(`♻️ Restoring session for: ${userNumber}`);
                        
                        // Create a dummy socket object for restoration
                        const dummySocket = {
                            emit: (event, data) => {
                                console.log(`📡 Auto-restore event: ${event} for ${userNumber}`);
                            }
                        };
                        
                        await createSession(userNumber, dummySocket, true); // true = restore mode
                        
                        // Small delay between restorations
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        console.log(`⏭️ Skipping unregistered session: ${userNumber}`);
                    }
                } catch (error) {
                    console.log(`⚠️ Could not restore ${userNumber}:`, error.message);
                }
            }
        }
        
        console.log('✅ Session restoration complete');
    } catch (error) {
        console.error('❌ Error during session restoration:', error);
    }
}

async function createSession(userNumber, socket, isRestoring = false) {
    try {
        console.log(`🆕 Creating session for: ${userNumber}${isRestoring ? ' (RESTORING)' : ''}`);
        
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        await fs.ensureDir(sessionPath);
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        const { version } = await fetchLatestBaileysVersion();
        console.log(`📱 Using WA v${version.join('.')}`);
        
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            defaultQueryTimeoutMs: undefined,
            getMessage: async () => ({ conversation: '' })
        });

        sock.userNumber = userNumber;
        sock.isRestoring = isRestoring;
        sessions.set(userNumber, sock);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log('🔗 Connection update:', { 
                connection, 
                hasQR: !!qr, 
                userNumber,
                isRestoring 
            });
            
            if (qr && !isRestoring) {
                console.log(`📱 QR code generated`);
                socket.emit('qr', { 
                    userNumber,
                    qr: qr,
                    instructions: 'Scan with WhatsApp'
                });
            }
            
            if (connection === 'open') {
                console.log(`✅ WhatsApp connected: ${userNumber}`);
                
                const timeout = pairingTimeouts.get(userNumber);
                if (timeout) {
                    clearTimeout(timeout);
                    pairingTimeouts.delete(userNumber);
                }
                
                await updateBotProfile(sock);
                
                if (!isRestoring) {
                    socket.emit('connected', { 
                        userNumber, 
                        message: '🤖 WhatsApp connected!'
                    });
                }
                
                await loadUserConfig(userNumber, sock);
                
                // Send welcome message only for new connections
                if (!isRestoring) {
                    const ownerJid = `${process.env.OWNER_NUMBER}@s.whatsapp.net`;
                    try {
                        await sock.sendMessage(ownerJid, { 
                            text: `🚀 *${process.env.BOT_NAME} Activated!*\n\nType ${process.env.PREFIX}menu to see all commands.` 
                        });
                    } catch (error) {
                        console.log('Could not send welcome message');
                    }
                } else {
                    console.log(`♻️ Session restored successfully: ${userNumber}`);
                }
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                
                console.log(`❌ Connection closed. Reason: ${statusCode}`);
                
                if (!isRestoring) {
                    socket.emit('disconnected', { 
                        userNumber, 
                        reason: statusCode
                    });
                }
                
                // IMPORTANT: Only delete session data if user logged out
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(`🚪 User logged out: ${userNumber} - Deleting session data`);
                    
                    // Delete the entire session folder
                    const sessionPath = path.join(__dirname, 'sessions', userNumber);
                    try {
                        await fs.remove(sessionPath);
                        console.log(`🗑️ Session folder deleted: ${sessionPath}`);
                    } catch (error) {
                        console.log('Error deleting session folder:', error);
                    }
                    
                    await cleanupSession(userNumber);
                } else {
                    // Just cleanup the socket connection but keep session data
                    console.log(`💾 Keeping session data for: ${userNumber} (Reason: ${statusCode})`);
                    
                    const sock = sessions.get(userNumber);
                    if (sock) {
                        try {
                            sock.end(undefined);
                        } catch (error) {
                            console.log('Error closing socket:', error);
                        }
                        sessions.delete(userNumber);
                    }
                    
                    // Try to reconnect after a delay (except for loggedOut)
                    if (statusCode !== DisconnectReason.loggedOut) {
                        console.log(`🔄 Will attempt reconnection for: ${userNumber} in 5 seconds`);
                        setTimeout(() => {
                            // Check if session data still exists
                            const sessionPath = path.join(__dirname, 'sessions', userNumber);
                            if (fs.existsSync(sessionPath)) {
                                createSession(userNumber, socket, true);
                            }
                        }, 5000);
                    }
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('messages.upsert', async (m) => {
            await handleMessage(m, sock, userNumber);
        });

        // Request pairing code only for new sessions (not restoring)
        if (!state.creds?.registered && !isRestoring) {
            console.log(`🔢 Requesting pairing code for ${userNumber}...`);
            
            setTimeout(async () => {
                try {
                    const phoneNumber = userNumber.replace(/\D/g, '');
                    const code = await sock.requestPairingCode(phoneNumber);
                    
                    console.log(`✅ Pairing code: ${code}`);
                    
                    const timeout = setTimeout(() => {
                        if (sessions.get(userNumber) === sock) {
                            console.log(`⏰ Pairing expired`);
                            socket.emit('pairing-expired', { userNumber });
                            cleanupSession(userNumber);
                        }
                    }, 90000);
                    
                    pairingTimeouts.set(userNumber, timeout);
                    
                    socket.emit('pairing-code', { 
                        pairingCode: code, 
                        userNumber,
                        instructions: 'Open WhatsApp → Linked Devices → Link Device → Enter code'
                    });
                } catch (error) {
                    console.error('❌ Pairing error:', error);
                    socket.emit('error', { 
                        userNumber, 
                        error: 'Failed to generate pairing code: ' + error.message
                    });
                    await cleanupSession(userNumber);
                }
            }, 5000);
        }
        
        return sock;
    } catch (error) {
        console.error('❌ Session creation error:', error);
        if (!isRestoring) {
            socket.emit('error', { userNumber, error: error.message });
        }
        await cleanupSession(userNumber);
    }
}

async function cleanupSession(userNumber) {
    console.log(`🧹 Cleaning up: ${userNumber}`);
    
    const timeout = pairingTimeouts.get(userNumber);
    if (timeout) {
        clearTimeout(timeout);
        pairingTimeouts.delete(userNumber);
    }
    
    const sock = sessions.get(userNumber);
    if (sock) {
        try {
            sock.end(undefined);
        } catch (error) {
            console.log('Error closing socket:', error);
        }
        sessions.delete(userNumber);
    }
    
    userConfigs.delete(userNumber);
}

async function updateBotProfile(sock) {
    try {
        await sock.updateProfileName(process.env.BOT_NAME);
        console.log('✅ Bot profile updated');
    } catch (error) {
        console.log('⚠️ Could not update profile');
    }
}

async function handleMessage(m, sock, userNumber) {
    if (!m.messages || m.type !== 'notify') return;
    
    const message = m.messages[0];
    if (!message.message || message.key.fromMe) return;

    const config = userConfigs.get(userNumber) || await loadUserConfig(userNumber, sock);
    const prefix = config.prefix || process.env.PREFIX;
    const body = getMessageBody(message);

    if (body && body.startsWith(prefix)) {
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        loadCommands();
        const command = commands.get(commandName);
        
        if (command) {
            console.log(`⚡ Command: ${commandName}`);
            
            if (command.ownerOnly && !isOwner(message.key.remoteJid)) {
                return sock.sendMessage(message.key.remoteJid, { 
                    text: '❌ *Owner Only!*' 
                }, { quoted: message });
            }
            
            if (command.groupOnly && !message.key.remoteJid.endsWith('@g.us')) {
                return sock.sendMessage(message.key.remoteJid, { 
                    text: '❌ *Group Only!*' 
                }, { quoted: message });
            }
            
            try {
                await command.execute(sock, message, args, userNumber, config);
            } catch (error) {
                console.error('Command error:', error);
                await sock.sendMessage(message.key.remoteJid, { 
                    text: '❌ *Error!* Command failed.' 
                }, { quoted: message });
            }
        } else if (commandName === 'menu' || commandName === 'help') {
            await generateMenu(sock, message, config, userNumber);
        }
    }
}

function getMessageBody(message) {
    return message.message.conversation || 
           message.message.extendedTextMessage?.text || 
           message.message.imageMessage?.caption ||
           message.message.videoMessage?.caption ||
           '';
}

function isOwner(jid) {
    return jid === `${process.env.OWNER_NUMBER}@s.whatsapp.net`;
}

async function generateMenu(sock, message, config, userNumber) {
    const prefix = config.prefix || process.env.PREFIX;
    loadCommands();
    const allCommands = Array.from(commands.values());
    
    const commandGroups = {
        '🌟 GENERAL': allCommands.filter(cmd => !cmd.ownerOnly && !cmd.groupOnly),
        '👑 OWNER': allCommands.filter(cmd => cmd.ownerOnly),
        '👥 GROUP': allCommands.filter(cmd => cmd.groupOnly)
    };
    
    let menuText = `🚀 *${config.botName || process.env.BOT_NAME}* 🚀

📌 *Prefix:* ${prefix}
👤 *Owner:* ${config.ownerName || process.env.OWNER_NAME}
🔧 *Commands:* ${allCommands.length}

📋 *COMMAND LIST*
───────────────────\n`;

    for (const [groupName, groupCommands] of Object.entries(commandGroups)) {
        if (groupCommands.length > 0) {
            menuText += `\n*${groupName}*\n`;
            groupCommands.forEach(cmd => {
                menuText += `➤ ${prefix}${cmd.name} ${cmd.emoji || '🔹'}\n`;
            });
        }
    }

    menuText += `\n───────────────────
💡 Use ${prefix}help [command] for info`;

    await sock.sendMessage(message.key.remoteJid, { 
        text: menuText
    }, { quoted: message });
}

async function loadUserConfig(userNumber, sock) {
    const configPath = path.join(__dirname, 'sessions', userNumber, 'config.json');
    let config = {};
    
    try {
        if (fs.existsSync(configPath)) {
            config = await fs.readJson(configPath);
        }
    } catch (error) {
        console.log('Creating new config');
    }
    
    config.prefix = config.prefix || process.env.PREFIX;
    config.botName = config.botName || process.env.BOT_NAME;
    config.ownerName = config.ownerName || process.env.OWNER_NAME;
    config.startTime = config.startTime || Date.now();
    
    userConfigs.set(userNumber, config);
    return config;
}

async function saveUserConfig(userNumber, config) {
    const configPath = path.join(__dirname, 'sessions', userNumber, 'config.json');
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, config, { spaces: 2 });
    userConfigs.set(userNumber, config);
}

io.on('connection', (socket) => {
    console.log('🌐 Frontend connected:', socket.id);
    
    socket.on('create-session', async (data) => {
        const userNumber = typeof data === 'string' ? data : data.userNumber;
        console.log('🆕 Creating session for:', userNumber);
        await createSession(userNumber, socket, false);
    });
    
    socket.on('disconnect-session', async (userNumber) => {
        console.log('🔌 Disconnect:', userNumber);
        await cleanupSession(userNumber);
        socket.emit('session-cleaned', { userNumber });
    });
    
    socket.on('disconnect', () => {
        console.log('🌐 Frontend disconnected:', socket.id);
    });
});

app.post('/api/pair', async (req, res) => {
    try {
        const { userNumber } = req.body;
        if (!userNumber) {
            return res.status(400).json({ error: 'WhatsApp number required' });
        }

        const cleanNumber = userNumber.replace(/\D/g, '');
        if (!/^\d+$/.test(cleanNumber) || cleanNumber.length < 10 || cleanNumber.length > 15) {
            return res.status(400).json({ error: 'Invalid WhatsApp number' });
        }
        
        res.json({ 
            success: true, 
            message: 'Pairing request received',
            userNumber: cleanNumber
        });
        
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

app.delete('/api/session/:userNumber', async (req, res) => {
    try {
        const { userNumber } = req.params;
        await cleanupSession(userNumber);
        
        // Also delete the session folder
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        if (await fs.pathExists(sessionPath)) {
            await fs.remove(sessionPath);
            console.log(`🗑️ Manually deleted session: ${sessionPath}`);
        }
        
        res.json({ message: 'Session deleted completely', userNumber });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        bot_name: process.env.BOT_NAME,
        owner_name: process.env.OWNER_NAME,
        status: 'running',
        active_sessions: sessions.size,
        total_commands: commands.size,
        uptime: process.uptime()
    });
});

// NEW: Get list of all sessions
app.get('/api/sessions', async (req, res) => {
    try {
        const sessionsPath = path.join(__dirname, 'sessions');
        const activeSessions = [];
        
        if (await fs.pathExists(sessionsPath)) {
            const folders = await fs.readdir(sessionsPath);
            
            for (const userNumber of folders) {
                const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
                if (await fs.pathExists(credsPath)) {
                    const creds = await fs.readJson(credsPath);
                    activeSessions.push({
                        userNumber,
                        registered: creds.registered || false,
                        isConnected: sessions.has(userNumber)
                    });
                }
            }
        }
        
        res.json({ 
            sessions: activeSessions,
            count: activeSessions.length 
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    console.log(`🚀 Tracle-Lite running on port ${PORT}`);
    console.log(`🤖 Bot: ${process.env.BOT_NAME}`);
    console.log(`👑 Owner: ${process.env.OWNER_NAME}`);
    console.log(`📦 Commands: ${commands.size}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`💾 Session persistence: ENABLED`);
    
    // Restore existing sessions after server starts
    await restoreExistingSessions();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔻 Shutting down gracefully...');
    console.log('💾 Keeping all session data for next restart');
    
    // Close all socket connections but keep session data
    for (const [userNumber, sock] of sessions.entries()) {
        console.log(`🔌 Closing connection: ${userNumber}`);
        try {
            sock.end(undefined);
        } catch (error) {
            console.log('Error closing socket:', error);
        }
    }
    
    console.log('✅ Shutdown complete');
    process.exit(0);
});
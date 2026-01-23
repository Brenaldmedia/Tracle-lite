// =============== ENVIRONMENT CONFIGURATION ===============
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const nodemailer = require('nodemailer');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();

// =============== AUTO-DETECT ENVIRONMENT ===============
const IS_HEROKU = process.env.NODE_ENV === 'production' || process.env.HEROKU || 
                  (process.env._ && process.env._.indexOf("heroku") !== -1);
const IS_LOCAL = !IS_HEROKU;

// Auto-detect Heroku app name from environment or use current host
let HEROKU_APP_NAME = 'your-app';
if (IS_HEROKU) {
    // Try multiple ways to get the app name
    HEROKU_APP_NAME = process.env.HEROKU_APP_NAME || 
                     process.env.APP_NAME || 
                     (process.env.HOSTNAME ? process.env.HOSTNAME.split('.')[0] : 'your-app') ||
                     'your-app';
}

// Configure ports - SIMPLIFIED
const BACKEND_PORT = process.env.PORT || 3000;
const FRONTEND_PORT = BACKEND_PORT; // Same port

console.log(`🌍 Environment: ${IS_HEROKU ? 'Heroku Production' : 'Local Development'}`);
console.log(`🚀 Port: ${BACKEND_PORT}`);
if (IS_HEROKU) console.log(`🏷️  Heroku App: ${HEROKU_APP_NAME}`);

// =============== SIMPLIFIED CORS CONFIGURATION ===============
const allowedOrigins = [
    // Local development
    `http://localhost:${FRONTEND_PORT}`,
    `http://127.0.0.1:${FRONTEND_PORT}`,
    
    // Heroku domains (wildcard for any Heroku app)
    'https://*.herokuapp.com',
    'http://*.herokuapp.com',
    
    // Allow no origin (like mobile apps or direct connections)
    null
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        // Allow localhost and Heroku domains
        if (origin.includes('localhost') || 
            origin.includes('127.0.0.1') || 
            origin.includes('herokuapp.com')) {
            callback(null, true);
        } else {
            // In development, allow all origins for testing
            if (IS_LOCAL) {
                callback(null, true);
            } else {
                console.log('🌐 CORS blocked origin:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
}));

// Handle preflight requests
app.options('*', cors());

// =============== EXPRESS APP SETUP ===============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============== SERVE STATIC FILES (FRONTEND) ===============
console.log('📁 Setting up static file serving...');
const publicPath = path.join(__dirname, 'public');

// Check if public folder exists
if (fs.existsSync(publicPath)) {
    console.log(`✅ Public folder found at: ${publicPath}`);
    
    // Serve static files from public folder
    app.use(express.static(publicPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        setHeaders: (res, path) => {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }));
    
    // Route all non-API requests to index.html (for SPA)
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
            return next();
        }
        
        // Check if it's a file request
        const filePath = path.join(publicPath, req.path);
        if (fs.existsSync(filePath) && !req.path.endsWith('/')) {
            return next(); // Let express.static handle it
        }
        
        // Otherwise serve index.html for SPA routing
        res.sendFile(path.join(publicPath, 'index.html'));
    });
    
    console.log('✅ Static file serving configured');
} else {
    console.error('❌ ERROR: Public folder not found at:', publicPath);
    console.log('📁 Creating public folder...');
    fs.ensureDirSync(publicPath);
    fs.writeFileSync(path.join(publicPath, 'index.html'), '<html><body><h1>Tracle-Lite</h1><p>Place your frontend files here</p></body></html>');
}

// =============== CREATE HTTP SERVER ===============
const server = http.createServer(app);

// =============== SOCKET.IO CONFIGURATION ===============
const io = socketIO(server, {
    cors: {
        origin: "*", // Allow all origins for now
        credentials: true,
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'], // Ensure polling is available
    allowEIO3: true, // Allow Engine.IO v3
    pingTimeout: 60000,
    pingInterval: 25000,
    cookie: false,
    maxHttpBufferSize: 1e8 // 100MB
});

// Handle Socket.IO connection errors
io.engine.on("connection_error", (err) => {
    console.log('🔌 Socket.IO connection error:', {
        code: err.code,
        message: err.message,
        req: err.req?.headers?.origin || 'unknown'
    });
});

// =============== START SERVER ===============
server.listen(BACKEND_PORT, () => {
    console.log(`
    ============================================
    🚀 TRACLE-LITE V2 - UNIVERSAL DEPLOYMENT
    ============================================
    📍 Environment: ${IS_HEROKU ? 'Heroku Production' : 'Local Development'}
    🔗 Backend URL: ${IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com` : `http://localhost:${BACKEND_PORT}`}
    🖥️  Frontend URL: ${IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com` : `http://localhost:${FRONTEND_PORT}`}
    📁 Public folder: ${publicPath}
    🔌 WebSocket: ${IS_HEROKU ? `wss://${HEROKU_APP_NAME}.herokuapp.com` : `ws://localhost:${BACKEND_PORT}`}
    ============================================
    ✅ Server running on port ${BACKEND_PORT}
    ✅ Frontend served from /public folder
    ✅ Ready for Heroku, Render, or any deployment!
    ============================================
    `);
    
    // WebSocket debug information
    console.log(`\n🔌 WebSocket Debug Information:`);
    console.log(`   • WebSocket URL: ${IS_HEROKU ? `wss://${HEROKU_APP_NAME}.herokuapp.com` : `ws://localhost:${BACKEND_PORT}`}`);
    console.log(`   • Polling URL: ${IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com/socket.io/` : `http://localhost:${BACKEND_PORT}/socket.io/`}`);
    console.log(`   • Health Check: ${IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com/api/health` : `http://localhost:${BACKEND_PORT}/api/health`}`);
    console.log(`   • WS Test: ${IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com/api/ws-test` : `http://localhost:${BACKEND_PORT}/api/ws-test`}`);
    console.log(`\n📡 Socket.IO Transport: ['websocket', 'polling']`);
    console.log(`🌐 CORS: Enabled (origin: "*")`);
});

// =============== BOT LOGIC (SAME AS BEFORE) ===============
console.log('🤖 Loading Tracle-Lite bot processor...');

// Import all bot modules
const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
    Browsers,
    delay,
    isJidBroadcast,
    isJidGroup
} = require('@whiskeysockets/baileys');
const warnedUsers = new Map();
const pino = require('pino');

// Import command handler from commands.js
const commandHandler = require('./commands');
const { Antilink, getAntilink } = require('./lib/index');
const antibadwordModule = require('./lib/antibadword');
const welcomeModule = require('./commands/welcome');
const goodbyeModule = require('./commands/goodbye');
const anticallModule = require('./commands/anticall');

const sendMessageWithContext = commandHandler.sendMessageWithContext || async function(conn, jid, text, options = {}) {
    const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
        }
    };
    
    if (options.externalAdReply) {
        contextInfo.externalAdReply = options.externalAdReply;
    }
    
    return conn.sendMessage(jid, { 
        text,
        contextInfo
    }, options.quoted ? { quoted: options.quoted } : {});
};

// =============== WEBSOCKET TEST ENDPOINT ===============
app.get('/api/ws-test', (req, res) => {
    const connectedSockets = io.engine?.clientsCount || 0;
    
    res.json({
        success: true,
        message: 'WebSocket server is running',
        socketIO: true,
        connectedClients: connectedSockets,
        serverTime: new Date().toISOString(),
        url: IS_HEROKU ? `wss://${HEROKU_APP_NAME}.herokuapp.com` : `ws://localhost:${BACKEND_PORT}`,
        pollingUrl: IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com/socket.io/` : `http://localhost:${BACKEND_PORT}/socket.io/`,
        supports: ['websocket', 'polling']
    });
});
// =============== UNIVERSAL API ENDPOINTS ===============

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Tracle-Lite V2 Universal',
        environment: IS_HEROKU ? 'Production' : 'Development',
        frontendUrl: req.headers.origin || 'unknown',
        backendUrl: IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com` : `http://localhost:${BACKEND_PORT}`,
        socketIO: true,
        timestamp: new Date().toISOString(),
        processor: 'universal',
        message: 'Works anywhere: Heroku, Render, Railway, etc.'
    });
});

app.get('/api/test-connection', (req, res) => {
    res.json({
        success: true,
        message: 'Universal bot processor is running!',
        timestamp: new Date().toISOString(),
        environment: IS_HEROKU ? 'Production' : 'Development',
        platform: IS_HEROKU ? 'Heroku' : 'Local',
        supports: ['Heroku', 'Render', 'Railway', 'Anywhere']
    });
});

// Universal wake endpoint for free hosting services
app.get('/api/wake', (req, res) => {
    res.json({
        awake: true,
        timestamp: new Date().toISOString(),
        message: 'Instance is awake and running',
        environment: IS_HEROKU ? 'Production' : 'Development'
    });
});

// Simple ping endpoint
app.get('/api/ping', (req, res) => {
    res.json({
        pong: Date.now(),
        message: 'Server is alive',
        uptime: process.uptime()
    });
});

const backupManager = require('./backup');
const tokenManager = require('./token');
const adminManager = require('./admin');
const messageStore = new Map();
const userPrefixes = new Map();
const activeConnections = new Map();
app.locals.activeConnections = activeConnections;
const pairingTimeouts = new Map();
const sessions = new Map();
const welcomedUsers = new Set();
const statusMediaStore = new Map();

const groupTimers = new Map();

const ownerCache = new Map();
const CACHE_TTL = 60000;
const lastProcessedTimestamps = new Map();

// Session refresh system
const sessionRefreshTimers = new Map();
const SESSION_REFRESH_INTERVAL = 23 * 60 * 60 * 1000; // 23 hours

// Get commands from command handler
const commands = commandHandler.commands;

const BOT_NAME = process.env.BOT_NAME || "TRACLE - LITE";
const OWNER_NAME = process.env.OWNER_NAME || "Brenaldmedia";
const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || "https://files.catbox.moe/zlu6dx.jpg";
const REPO_LINK = process.env.REPO_LINK || "https://github.com/Brenaldmedia/Tracle";
const PREFIX = process.env.PREFIX || ".";
const DEV = process.env.DEV || 'Brenaldmedia';
const OWNER_NUMBERS_GLOBAL = process.env.OWNER_NUMBERS;

// Parse owner numbers
const OWNER_NUMBERS = OWNER_NUMBERS_GLOBAL ? 
    OWNER_NUMBERS_GLOBAL.split(',').map(num => num.replace(/\D/g, '')) : 
    [];
console.log(`👑 Global Owner Numbers from .env: ${OWNER_NUMBERS.join(', ') || 'Not set'}`);

const CHANNEL_JIDS = process.env.CHANNEL_JIDS
  ? [...new Set(process.env.CHANNEL_JIDS.split(','))]
  : [];

const GROUP_INVITE_LINK = "https://chat.whatsapp.com/HZnha8aKKQRDBOAtK5qUeC";
const TARGET_GROUP_JID = "120363420555765995@g.us";

const DEFAULT_USER_SETTINGS = {
    botMode: process.env.DEFAULT_BOT_MODE || "public",
    autoViewStatus: process.env.DEFAULT_AUTO_VIEW_STATUS || "true",
    autoLikeStatus: process.env.DEFAULT_AUTO_LIKE_STATUS || "false",
    antiDelete: process.env.ENABLE_ANTIDELETE || "true",
    antiDeleteMode: "dm",
    bankName: process.env.DEFAULT_BANK_NAME || "ZENITH Bank",
    accountNumber: process.env.DEFAULT_ACCOUNT_NUMBER || "2126335411",
    accountName: process.env.DEFAULT_ACCOUNT_NAME || "EMMANUEL ISIBOR",
    botImage: MENU_IMAGE_URL,
    ownerName: OWNER_NAME,
    botName: BOT_NAME,
     welcomeEnabled: "false",
    goodbyeEnabled: "false",
    groupOpenTime: null,
    groupCloseTime: null
};

// Configure email transporter with timeout
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    // Timeout settings for reliability
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    secureConnection: false
});

// Test email configuration on startup
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

// =============== SESSION REFRESH SYSTEM ===============
function startSessionRefreshSystem(sessionId, conn) {
    console.log(`🔄 Starting session refresh system for ${sessionId} (every 23 hours)`);
    
    if (sessionRefreshTimers.has(sessionId)) {
        clearInterval(sessionRefreshTimers.get(sessionId));
        sessionRefreshTimers.delete(sessionId);
    }
    
    const timer = setInterval(async () => {
        try {
            const connectionData = activeConnections.get(sessionId);
            if (!connectionData || !connectionData.isConnected || !conn || !conn.user) {
                console.log(`⚠️ Session ${sessionId} is not connected, skipping refresh`);
                return;
            }
            
            console.log(`♻️ Refreshing session: ${sessionId}`);
            
            // Send a ping message to keep session active
            const botJid = conn.user.id;
            let botNumber = '';
            if (botJid.includes(':')) {
                botNumber = botJid.split(':')[0];
            } else {
                botNumber = botJid.split('@')[0];
            }
            
            botNumber = botNumber.replace(/\D/g, '');
            const userJid = `${botNumber}@s.whatsapp.net`;
            
            const userSettings = getUserSettings(sessionId);
            
            await sendMessageWithContext(conn, userJid, 
                '🔄 Session refresh - Bot remains active', {
                externalAdReply: {
                    title: "Session Refresh",
                    body: "Keeping your bot active",
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            }).catch(() => {});
            
            // Update connection timestamp
            connectionData.lastActivity = Date.now();
            
            console.log(`✅ Session refreshed: ${sessionId}`);
            
        } catch (error) {
            console.error(`❌ Error refreshing session ${sessionId}:`, error.message);
        }
    }, SESSION_REFRESH_INTERVAL);
    
    sessionRefreshTimers.set(sessionId, timer);
    console.log(`✅ Session refresh system started for ${sessionId}`);
}

function stopSessionRefreshSystem(sessionId) {
    if (sessionRefreshTimers.has(sessionId)) {
        clearInterval(sessionRefreshTimers.get(sessionId));
        sessionRefreshTimers.delete(sessionId);
        console.log(`🛑 Stopped session refresh system for ${sessionId}`);
    }
}

// =============== ALIVE MESSAGE SYSTEM ===============
const ALIVE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const CONNECTION_CHECK_INTERVAL = 5 * 60 * 1000;
const aliveCheckTimers = new Map();

function startAliveMessageSystem(sessionId, conn, userSettings) {
    console.log(`🔄 Starting alive message system for ${sessionId} (every 6 hours)`);
    
    if (aliveCheckTimers.has(sessionId)) {
        clearInterval(aliveCheckTimers.get(sessionId));
        aliveCheckTimers.delete(sessionId);
    }
    
    const timer = setInterval(async () => {
        try {
            if (!conn || !conn.user || !conn.user.id) {
                console.log(`⚠️ Connection not available for ${sessionId}, skipping alive check`);
                return;
            }
            
            const connectionData = activeConnections.get(sessionId);
            if (!connectionData || !connectionData.isConnected) {
                console.log(`⚠️ Session ${sessionId} is not connected, skipping alive check`);
                return;
            }
            
            console.log(`🔍 Performing alive check for ${sessionId}`);
            
            const botJid = conn.user.id;
            let botNumber = '';
            if (botJid.includes(':')) {
                botNumber = botJid.split(':')[0];
            } else {
                botNumber = botJid.split('@')[0];
            }
            
            botNumber = botNumber.replace(/\D/g, '');
            const userJid = `${botNumber}@s.whatsapp.net`;
            
            const aliveMessage = `💀 *${userSettings.botName || BOT_NAME} - SYSTEM STATUS REPORT* 💀

Surprise. I'm still alive.
Trust me, I'm just as shocked as you are.

🕒 Time: ${new Date().toLocaleString()}
📱 Session ID: ${sessionId}
⚙️ Status: Running (for now… probably)
📡 Connection: Running smoothly
🧠 Bot Health: 100%

I haven't crashed yet, which is honestly impressive.
Need something? Type *${userPrefixes.get(sessionId) || PREFIX}menu*.

Anyway… stay chaotic. 🌚`;

            console.log(`💌 Sending alive message to ${userJid} for session ${sessionId}`);
            
            await sendMessageWithContext(conn, userJid, aliveMessage, {
                externalAdReply: {
                    title: `${userSettings.botName || BOT_NAME} Status`,
                    body: "Still alive and running",
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            });
            
            console.log(`✅ Alive message sent successfully for ${sessionId}`);
            
        } catch (error) {
            console.error(`❌ Error sending alive message for ${sessionId}:`, error.message);
            
            if (error.message.includes('Connection closed') || error.message.includes('not connected')) {
                console.log(`🔄 Attempting to restart connection for ${sessionId}`);
                const connectionData = activeConnections.get(sessionId);
                if (connectionData) {
                    connectionData.isConnected = false;
                }
            }
        }
    }, ALIVE_CHECK_INTERVAL);
    
    aliveCheckTimers.set(sessionId, timer);
    console.log(`✅ Alive message system started for ${sessionId} (every 6 hours)`);
}

function stopAliveMessageSystem(sessionId) {
    if (aliveCheckTimers.has(sessionId)) {
        clearInterval(aliveCheckTimers.get(sessionId));
        aliveCheckTimers.delete(sessionId);
        console.log(`🛑 Stopped alive message system for ${sessionId}`);
    }
}

function startConnectionMonitor() {
    setInterval(() => {
        console.log(`🔍 Checking ${activeConnections.size} active connections...`);
        
        for (const [sessionId, connectionData] of activeConnections.entries()) {
            const { conn, isConnected } = connectionData;
            
            if (!conn || !conn.user || !conn.user.id) {
                console.log(`⚠️ Connection invalid for ${sessionId}, marking as disconnected`);
                connectionData.isConnected = false;
                continue;
            }
            
            try {
                connectionData.lastActivity = Date.now();
                
                if (!isConnected) {
                    console.log(`🔄 Connection marked as disconnected for ${sessionId}, attempting to restore...`);
                }
            } catch (error) {
                console.error(`❌ Connection check failed for ${sessionId}:`, error.message);
                connectionData.isConnected = false;
            }
        }
    }, CONNECTION_CHECK_INTERVAL);
}

function getUserSettings(sessionId) {
    const userConnection = activeConnections.get(sessionId);
    if (userConnection && userConnection.settings) {
        return userConnection.settings;
    }
    
    const savedSettings = loadUserSettingsFromFile(sessionId);
    if (userConnection) {
        userConnection.settings = savedSettings;
    }
    return savedSettings;
}

function updateUserSettings(sessionId, newSettings) {
    const userConnection = activeConnections.get(sessionId);
    if (userConnection) {
        userConnection.settings = { ...userConnection.settings, ...newSettings };
        saveUserSettingsToFile(sessionId, userConnection.settings);
        return true;
    }
    return false;
}

function saveUserSettingsToFile(sessionId, settings) {
    try {
        const settingsDir = path.join(__dirname, "sessions", sessionId);
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
        
        const settingsPath = path.join(settingsDir, "settings.json");
        console.log(`💾 Saved settings for ${sessionId}`);
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error("Error saving user settings:", error);
    }
}

function loadUserSettingsFromFile(sessionId) {
    try {
        const settingsPath = path.join(__dirname, "sessions", sessionId, "settings.json");
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            return settings;
        }
    } catch (error) {
        console.error("Error loading user settings:", error);
    }
    return { ...DEFAULT_USER_SETTINGS };
}

// Make getUserSettings available globally
global.getUserSettings = getUserSettings;
global.isBotOwner = isBotOwner;
global.updateUserSettings = updateUserSettings;

// =============== FIXED: WORKING OWNER RECOGNITION ===============
function isBotOwner(conn, message, sessionId) {
    try {
        console.log(`\n🔍 BOT OWNER CHECK:`);
        console.log(`  • Session ID: ${sessionId}`);
        console.log(`  • Message fromMe: ${message.key?.fromMe}`);
        
        // First, get session number
        const sessionNumber = sessionId.replace(/\D/g, '');
        console.log(`  • Session Number: ${sessionNumber}`);
        
        // Get sender JID
        const senderJid = message.key?.participant || message.key?.remoteJid;
        console.log(`  • Sender JID: ${senderJid}`);
        
        // Extract sender number
        let senderNumber = '';
        if (senderJid) {
            if (senderJid.includes('@lid')) {
                senderNumber = senderJid.split('@')[0];
            } else if (senderJid.includes('@s.whatsapp.net')) {
                senderNumber = senderJid.split('@')[0];
            } else if (senderJid.includes(':')) {
                senderNumber = senderJid.split(':')[0];
            } else {
                senderNumber = senderJid;
            }
            senderNumber = senderNumber.replace(/\D/g, '');
        }
        console.log(`  • Sender Number: ${senderNumber}`);
        
        // Method 1: Check if message is from bot itself (owner)
        if (message.key && message.key.fromMe === true) {
            console.log(`✅ OWNER CONFIRMED: Message is from bot itself (fromMe: true)`);
            return true;
        }

        // Method 2: Check if sender is the session owner
        if (senderNumber && sessionNumber) {
            // Check if sender number matches session number
            if (senderNumber === sessionNumber) {
                console.log(`✅ OWNER CONFIRMED: Sender ${senderNumber} is session owner ${sessionNumber}`);
                return true;
            }
            
            // Check if sender number is in owner numbers
            for (const ownerNum of OWNER_NUMBERS) {
                if (senderNumber.includes(ownerNum) || ownerNum.includes(senderNumber)) {
                    console.log(`✅ OWNER CONFIRMED: Sender ${senderNumber} matches owner number ${ownerNum}`);
                    return true;
                }
            }
        }
        
        // Method 3: Check if session number is in owner numbers
        for (const ownerNum of OWNER_NUMBERS) {
            if (sessionNumber.includes(ownerNum) || ownerNum.includes(sessionNumber)) {
                console.log(`✅ OWNER CONFIRMED: Session ${sessionNumber} matches owner number ${ownerNum}`);
                return true;
            }
        }
        
        console.log(`❌ NOT OWNER: No match found`);
        console.log(`   Session: ${sessionNumber}, Sender: ${senderNumber}`);
        
        return false;
        
    } catch (error) {
        console.error("❌ Error in owner check:", error);
        return false;
    }
}

function shouldBotRespond(conn, message, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        
        console.log(`\n🔍 SHOULD BOT RESPOND CHECK:`);
        console.log(`Bot Mode: ${userSettings.botMode}`);
        console.log(`Session: ${sessionId}`);
        
        // Check if this user is the owner of this specific session
        const isOwner = isBotOwner(conn, message, sessionId);
        
        if (userSettings.botMode === "public") {
            console.log(`✅ Public mode - responding to everyone`);
            return true;
        } else if (userSettings.botMode === "private") {
            console.log(`🔒 Private mode - checking ownership...`);
            console.log(`Is Owner: ${isOwner}`);
            
            // IMPORTANT: Only respond to owner, silently ignore non-owners
            return isOwner;
        }
        
        return false;
    } catch (error) {
        console.error("Error checking bot response:", error);
        return true;
    }
}

function getMessageType(message) {
    if (message.message?.conversation) return 'TEXT';
    if (message.message?.extendedTextMessage) return 'TEXT';
    if (message.message?.imageMessage) return 'IMAGE';
    if (message.message?.videoMessage) return 'VIDEO';
    if (message.message?.audioMessage) {
        if (message.message.audioMessage.ptt === true) {
            return 'VOICE';
        }
        return 'AUDIO';
    }
    if (message.message?.documentMessage) return 'DOCUMENT';
    if (message.message?.stickerMessage) return 'STICKER';
    if (message.message?.contactMessage) return 'CONTACT';
    if (message.message?.locationMessage) return 'LOCATION';
    if (message.message?.pollCreationMessage) return 'POLL';
    if (message.message?.reactionMessage) return 'REACTION';
    
    return 'UNKNOWN';
}

// =============== ANTILINK CHECK FUNCTION ===============
async function checkAntilink(conn, message, sessionId) {
    try {
        const jid = message.key.remoteJid;
        
        // Only check groups
        if (!isJidGroup(jid) || !message.message) return;
        
        // Get message text
        const body = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || '';
        
        if (!body || typeof body !== 'string') return;
        
        // Get antilink configuration
        const antilinkConfig = await getAntilink(jid);
        if (!antilinkConfig || !antilinkConfig.enabled) return;
        
        // Check if it's a command (starts with prefix)
        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        if (body.startsWith(userPrefix)) return;
        
        // Process antilink
        await Antilink(message, conn, sessionId);
    } catch (error) {
        console.error('Error in checkAntilink:', error);
    }
}

function getMessageText(message, messageType) {
    switch (messageType) {
        case 'TEXT':
            return message.message?.conversation || 
                   message.message?.extendedTextMessage?.text || '';
        case 'IMAGE':
            return message.message?.imageMessage?.caption || '[Image]';
        case 'VIDEO':
            return message.message?.videoMessage?.caption || '[Video]';
        case 'AUDIO':
            return '[Audio]';
        case 'VOICE':
            return '[Voice Note]';
        case 'DOCUMENT':
            return message.message?.documentMessage?.fileName || '[Document]';
        case 'STICKER':
            return '[Sticker]';
        case 'CONTACT':
            return '[Contact]';
        case 'LOCATION':
            return '[Location]';
        case 'POLL':
            return '[Poll]';
        case 'REACTION':
            return '[Reaction]';
        default:
            return `[${messageType}]`;
    }
}

async function handleAntiDelete(conn, update, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        
        if (userSettings.antiDelete !== "true") return;
        
        if (update.update && update.update.message === null && update.key) {
            const deletedMessageKey = `${update.key.remoteJid}_${update.key.id}`;
            const deletedMessage = messageStore.get(deletedMessageKey);
            
            if (deletedMessage) {
                const { message, sender, text, groupName, messageType, mediaData, timestamp } = deletedMessage;
                const deleter = update.key.participant || update.key.remoteJid;
                
                let restoreMessage = `🚫 *ANTI-DELETE DETECTED*\n\n`;
                
                if (groupName) {
                    restoreMessage += `👥 *Group:* ${groupName}\n`;
                }
                
                if (sender) {
                    restoreMessage += `👤 *Sender:* @${sender.split('@')[0]}\n`;
                }
                
                if (deleter) {
                    restoreMessage += `🗑️ *Deleted by:* @${deleter.split('@')[0]}\n`;
                }
                
                restoreMessage += `⏰ *Time:* ${new Date(timestamp).toLocaleString()}\n\n`;
                
                const botJid = conn.user.id;
                const botPhoneNumber = botJid.split(':')[0] || botJid.split('@')[0];
                const ownerJid = `${botPhoneNumber}@s.whatsapp.net`;
                
                if (userSettings.antiDeleteMode === "dm") {
                    if (mediaData) {
                        await conn.sendMessage(ownerJid, {
                            ...mediaData,
                            caption: restoreMessage + `📎 *Type:* ${messageType}\n💬 *Content:* ${text || 'Media Message'}`,
                            mentions: [sender, deleter].filter(Boolean)
                        }, { quoted: message });
                    } else {
                        await sendMessageWithContext(conn, ownerJid, 
                            restoreMessage + `💬 *Deleted Message:* ${text}`, {
                            quoted: message,
                            mentions: [sender, deleter].filter(Boolean)
                        });
                    }
                } else {
                    if (mediaData) {
                        await conn.sendMessage(update.key.remoteJid, {
                            ...mediaData,
                            caption: restoreMessage + `📎 *Type:* ${messageType}\n💬 *Content:* ${text || 'Media Message'}`,
                            mentions: [sender, deleter].filter(Boolean)
                        }, { quoted: message });
                    } else {
                        await sendMessageWithContext(conn, update.key.remoteJid, 
                            restoreMessage + `💬 *Deleted Message:* ${text}`, {
                            quoted: message,
                            mentions: [sender, deleter].filter(Boolean)
                        });
                    }
                }
                
                messageStore.delete(deletedMessageKey);
            }
        }
    } catch (error) {
        console.error("❌ Anti-delete error:", error);
    }
}

async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

async function storeMessageForAntiDelete(conn, message) {
    try {
        if (message.key && message.message && !message.key.fromMe) {
            const messageKey = `${message.key.remoteJid}_${message.key.id}`;
            const messageType = getMessageType(message);
            const text = getMessageText(message, messageType);
            const sender = message.key.participant || message.key.remoteJid;
            
            let groupName = null;
            if (message.key.remoteJid.endsWith('@g.us')) {
                try {
                    const groupMetadata = await conn.groupMetadata(message.key.remoteJid);
                    groupName = groupMetadata.subject || 'Unknown Group';
                } catch (error) {
                    groupName = 'Unknown Group';
                }
            }

            let mediaData = null;
            
            if (messageType === 'IMAGE' && message.message.imageMessage) {
                try {
                    const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
                    const buffer = await streamToBuffer(stream);
                    mediaData = { image: buffer };
                } catch (error) {
                    console.error("Error downloading image:", error);
                }
            } else if (messageType === 'VIDEO' && message.message.videoMessage) {
                try {
                    const stream = await downloadContentFromMessage(message.message.videoMessage, 'video');
                    const buffer = await streamToBuffer(stream);
                    mediaData = { video: buffer };
                } catch (error) {
                    console.error("Error downloading video:", error);
                }
            } else if (messageType === 'AUDIO' && message.message.audioMessage) {
                try {
                    const stream = await downloadContentFromMessage(message.message.audioMessage, 'audio');
                    const buffer = await streamToBuffer(stream);
                    mediaData = { audio: buffer, mimetype: message.message.audioMessage.mimetype || 'audio/ogg' };
                } catch (error) {
                    console.error("Error downloading audio:", error);
                }
            } else if (messageType === 'VOICE' && message.message.audioMessage) {
                try {
                    const stream = await downloadContentFromMessage(message.message.audioMessage, 'audio');
                    const buffer = await streamToBuffer(stream);
                    mediaData = { audio: buffer, mimetype: message.message.audioMessage.mimetype || 'audio/ogg', ptt: true };
                } catch (error) {
                    console.error("Error downloading voice note:", error);
                }
            }
            
            messageStore.set(messageKey, {
                message: message,
                sender: sender,
                text: text,
                groupName: groupName,
                messageType: messageType,
                mediaData: mediaData,
                timestamp: Date.now()
            });
            
            if (messageStore.size > 1000) {
                const entries = Array.from(messageStore.entries());
                const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                const toDelete = sorted.slice(0, sorted.length - 1000);
                toDelete.forEach(([key]) => messageStore.delete(key));
            }
        }
    } catch (error) {
        console.error("Error storing message for anti-delete:", error);
    }
}

// =============== UPDATED MESSAGE HANDLING ===============
async function handleMessage(conn, message, sessionId) {
    try {
        console.log(`\n📨 Handling message from session: ${sessionId}`);
        
        // Check if this session is still active
        const connectionData = activeConnections.get(sessionId);
        if (!connectionData || !connectionData.isConnected) {
            console.log(`⚠️ Session ${sessionId} is not connected, ignoring message`);
            return;
        }
        
        // Update last activity
        connectionData.lastActivity = Date.now();
        
        
        if (message.key && message.key.remoteJid === 'status@broadcast') {
            const userSettings = getUserSettings(sessionId);
            
            if (userSettings.autoViewStatus === "true") {
                await conn.readMessages([message.key]).catch(console.error);
                console.log(`👀 Auto-viewed status for ${sessionId}`);
            }
            
            if (userSettings.autoLikeStatus === "true") {
                const botJid = conn.user.id;
                const emojis = ['❤', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊', '🌷', '⛅', '🌟', '🗿', '🇳🇬', '💜', '💙', '🌝', '🖤', '💚'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                await conn.sendMessage(message.key.remoteJid, {
                    react: {
                        text: randomEmoji,
                        key: message.key,
                    } 
                }, { statusJidList: [message.key.participant, botJid] }).catch(console.error);
                console.log(`❤️ Auto-liked status with ${randomEmoji} for ${sessionId}`);
            }
            
            return;
        }

        if (!message.message) return;
        
        // Check antilink for non-command messages
        await checkAntilink(conn, message, sessionId);
        
        // Antibadword detection for groups
        if (isJidGroup(message.key.remoteJid)) {
            try {
                const messageType = getMessageType(message);
                const body = getMessageText(message, messageType);
                
                const userPrefix = userPrefixes.get(sessionId) || PREFIX;
                if (!body.startsWith(userPrefix)) {
                    const senderId = message.key.participant || message.key.remoteJid;
                    
                    const antiBadwordConfig = await antibadwordModule.getAntiBadword(message.key.remoteJid);
                    if (antiBadwordConfig?.enabled) {
                        await antibadwordModule.handleBadwordDetection(conn, message.key.remoteJid, message, body, senderId);
                    }
                }
            } catch (error) {
                console.error('Error in antibadword detection:', error);
            }
        }

        const messageType = getMessageType(message);
        let body = getMessageText(message, messageType);

        await storeMessageForAntiDelete(conn, message);

        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        
        
        if (!body.startsWith(userPrefix)) return;

        const args = body.slice(userPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        console.log(`🔍 Detected command: ${commandName} from user: ${sessionId}`);
        
        // Check if bot should respond
        const shouldRespond = shouldBotRespond(conn, message, sessionId);
        console.log(`🤖 Should bot respond? ${shouldRespond ? '✅ YES' : '❌ NO'}`);
        
        if (!shouldRespond) {
            console.log(`🔒 Bot in private mode for user ${sessionId}, ignoring message from non-owner`);
            return;
        }

        // Get user settings
        const userSettings = getUserSettings(sessionId);
       
        // =============== COMMAND EXECUTION ===============
        if (commands.has(commandName)) {
            const command = commands.get(commandName);
            
            console.log(`🔧 Executing command: ${commandName} for session: ${sessionId}`);
            
            if (typeof command.execute !== 'function') {
                console.error(`❌ Command ${commandName} doesn't have execute() function`);
                await sendMessageWithContext(conn, message.key.remoteJid, 
                    `❌ Error: Command ${commandName} is not properly configured.`, {
                    quoted: message,
                    externalAdReply: {
                        title: "Command Error",
                        body: `Command ${commandName} is broken`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
                return;
            }
            
            try {
                // Create the reply function
                const reply = (text, options = {}) => {
                    const contextOptions = {
                        quoted: message,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: "120363401559573199@newsletter",
                                newsletterName: "BrenaldMedia",
                                serverMessageId: -1,
                            },
                            externalAdReply: options.externalAdReply || {
                                title: `${userSettings.botName || BOT_NAME} Command`,
                                body: `Executed: ${commandName}`,
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        },
                        ...options
                    };
                    
                    return conn.sendMessage(message.key.remoteJid, { text }, contextOptions);
                };
                
                const from = message.key.remoteJid;
                const isGroup = from.endsWith('@g.us');
                const isChannel = from.endsWith('@newsletter');
                
                let groupMetadata = null;
                if (isGroup) {
                    try {
                        groupMetadata = await conn.groupMetadata(from);
                    } catch (error) {
                        console.error("Error fetching group metadata:", error);
                    }
                }
                
                const quotedMessage = commandHandler.getQuotedMessage(message);
                
                const m = {
                    mentionedJid: message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
                    quoted: quotedMessage,
                    sender: message.key.participant || message.key.remoteJid,
                    reply: reply,
                    react: async (emoji) => {
                        return await conn.sendMessage(message.key.remoteJid, {
                            react: {
                                text: emoji,
                                key: message.key
                            }
                        });
                    }
                };
                
                const q = body.slice(userPrefix.length + commandName.length).trim();
                
                let isAdmins = false;
                let isCreator = false;
                
                if (isGroup && groupMetadata) {
                    const participant = groupMetadata.participants.find(p => p.id === m.sender);
                    isAdmins = participant?.admin === 'admin' || participant?.admin === 'superadmin';
                    isCreator = participant?.admin === 'superadmin';
                }
                
                // Check if it's an owner-only command
                if (command.ownerOnly) {
                    const isOwner = isBotOwner(conn, message, sessionId);
                    if (!isOwner) {
                        console.log(`🔒 Owner only command - denying access`);
                        
                        await sendMessageWithContext(conn, message.key.remoteJid, 
                            `❌ Denied. Come back with ownership papers.`, {
                            quoted: message,
                            externalAdReply: {
                                title: "Permission Denied",
                                body: "Skill issues",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        });
                        return;
                    }
                }
                
                // Prepare context object
                const context = {
                    args: args,
                    q: q,
                    reply: reply,
                    
                    from: from,
                    isGroup: isGroup,
                    isChannel: isChannel,
                    groupMetadata: groupMetadata,
                    sender: message.key.participant || message.key.remoteJid,
                    isAdmins: isAdmins,
                    isCreator: isCreator,
                    
                    sessionId: sessionId,
                    userSettings: userSettings,
                    userPrefix: userPrefix,
                    userPrefixes: userPrefixes,
                    
                    conn: conn,
                    connection: conn,
                    
                    message: message,
                    msg: message,
                    m: m,
                    mObj: m,
                    
                    BOT_NAME: BOT_NAME,
                    OWNER_NAME: OWNER_NAME,
                    MENU_IMAGE_URL: MENU_IMAGE_URL,
                    REPO_LINK: REPO_LINK,
                    PREFIX: PREFIX,
                    DEV: DEV,
                    
                    activeConnections: activeConnections,
                    commands: commands,
                    
                    getUserSettings: () => getUserSettings(sessionId),
                    updateUserSettings: (newSettings) => updateUserSettings(sessionId, newSettings),
                    isBotOwner: () => isBotOwner(conn, message, sessionId),
                    sendMessageWithContext: sendMessageWithContext,
                    
                    CHANNEL_JIDS: CHANNEL_JIDS,
                    GROUP_INVITE_LINK: GROUP_INVITE_LINK,
                    TARGET_GROUP_JID: TARGET_GROUP_JID,
                    
                    warnedUsers: warnedUsers,
                    sessions: sessions,
                    groupTimers: groupTimers
                };
                
                // Execute the command with full context
                await command.execute(conn, message, m, context);
                
            } catch (error) {
                console.error(`❌ Error executing command ${commandName}:`, error);
                
                await sendMessageWithContext(conn, message.key.remoteJid, 
                    `❌ Error executing command: ${error.message}\n\nPlease try again or contact admin.`, {
                    quoted: message,
                    externalAdReply: {
                        title: "Command Error",
                        body: `Failed to execute: ${commandName}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
            }
            return;
        }
        
        // =============== INBUILT COMMANDS ===============
        
        // MENU COMMAND
        if (commandName === 'menu' || commandName === 'help') {
            try {
                const menuText = commandHandler.generateMenu(
                    userPrefix, 
                    sessionId, 
                    userSettings, 
                    BOT_NAME, 
                    OWNER_NAME, 
                    commandHandler.commands
                );
                
                await sendMessageWithContext(conn, message.key.remoteJid, menuText, {
                    quoted: message,
                    externalAdReply: {
                        title: `${userSettings.botName || BOT_NAME} Menu`,
                        body: `${commandHandler.commands.size} commands available`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
                
            } catch (error) {
                console.error(`❌ Error generating menu:`, error);
                await sendMessageWithContext(conn, message.key.remoteJid, 
                    `❌ Error generating menu: ${error.message}`, {
                    quoted: message
                });
            }
            return;
        }
        
        // PING COMMAND
        if (commandName === 'ping') {
            const start = Date.now();
            await conn.sendPresenceUpdate('available', message.key.remoteJid);
            const latency = Date.now() - start;
            
            const activeSessions = Array.from(activeConnections.values()).filter(c => c.isConnected).length;
            
            await sendMessageWithContext(conn, message.key.remoteJid,
                `🏓 *PONG!*\n\n` +
                `⚡ *Speed:* ${latency}ms\n` +
                `🤖 *Bot:* ${userSettings.botName || BOT_NAME}\n` +
                `🔧 *Commands:* ${commands.size}\n` +
                `📱 *Active Sessions:* ${activeSessions}\n` +
                `🕒 *Uptime:* ${Math.floor(process.uptime() / 60)} minutes\n\n` +
                `✅ Bot is running smoothly!`, {
                quoted: message,
                externalAdReply: {
                    title: "Bot Status",
                    body: `Speed: ${latency}ms | Active: ${activeSessions}`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            });
            return;
        }
        
        // OWNER COMMAND
        if (commandName === 'owner') {
            await sendMessageWithContext(conn, message.key.remoteJid,
                `👑 *Owner Information*\n\n` +
                `• Name: ${userSettings.ownerName || OWNER_NAME}\n` +
                `• Bot: ${userSettings.botName || BOT_NAME}\n` +
                `• Mode: ${userSettings.botMode}\n` +
                `• Prefix: ${userPrefix}\n\n` +
                `💡 For support, use ${userPrefix}support`, {
                quoted: message,
                externalAdReply: {
                    title: "Owner Information",
                    body: `${userSettings.ownerName || OWNER_NAME}`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            });
            return;
        }
        
        // SUPPORT COMMAND
        if (commandName === 'support') {
            const supportMessage = commandHandler.generateSupportMessage(userSettings);
            await sendMessageWithContext(conn, message.key.remoteJid, supportMessage, {
                quoted: message,
                externalAdReply: {
                    title: `${userSettings.botName || BOT_NAME} Support`,
                    body: "Your support helps keep the bot running",
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            });
            return;
        }
        
        // PREFIX COMMAND
        if (commandName === 'prefix') {
            await sendMessageWithContext(conn, message.key.remoteJid,
                `📌 *Current prefix:* ${userPrefix}\n\n` +
                `To change prefix, use: ${userPrefix}setprefix [new prefix]\n\n` +
                `Example: ${userPrefix}setprefix !`, {
                quoted: message,
                externalAdReply: {
                    title: "Bot Prefix",
                    body: `Current: ${userPrefix}`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            });
            return;
        }
        
        // MODE COMMAND
        if (commandName === 'mode') {
            const newMode = args[0]?.toLowerCase();
            const validModes = ['public', 'private'];
            
            if (!newMode || !validModes.includes(newMode)) {
                await sendMessageWithContext(conn, message.key.remoteJid,
                    `📊 *Current Bot Mode:* ${userSettings.botMode}\n\n` +
                    `Usage: ${userPrefix}mode [public/private]\n\n` +
                    `• public: Bot responds to everyone\n` +
                    `• private: Bot only responds to owner`, {
                    quoted: message,
                    externalAdReply: {
                        title: "Bot Mode Settings",
                        body: `Current mode: ${userSettings.botMode}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
                return;
            }
            
            if (newMode === userSettings.botMode) {
                await sendMessageWithContext(conn, message.key.remoteJid,
                    `❌ Bot is already in ${userSettings.botMode} mode`, {
                    quoted: message,
                    externalAdReply: {
                        title: "Mode Unchanged",
                        body: `Bot is already in ${userSettings.botMode} mode`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
                return;
            }
            
            updateUserSettings(sessionId, { botMode: newMode });
            
            const modeMessage = `✅ *Bot Mode Updated*\n\n` +
                              `• Previous: ${userSettings.botMode}\n` +
                              `• New: ${newMode}\n\n` +
                              `${newMode === 'private' ? '🔒 Bot will now only respond to owner commands' : '🌍 Bot will now respond to everyone'}`;
            
            await sendMessageWithContext(conn, message.key.remoteJid, modeMessage, {
                quoted: message,
                externalAdReply: {
                    title: "Mode Changed Successfully",
                    body: `Bot mode changed to ${newMode}`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            });
            return;
        }
        
        // SETPREFIX COMMAND
        if (commandName === 'setprefix') {
            const newPrefix = args[0];
            
            if (!newPrefix) {
                await sendMessageWithContext(conn, message.key.remoteJid,
                    `❌ Please provide a new prefix\n\n` +
                    `Usage: ${userPrefix}setprefix [new prefix]\n` +
                    `Example: ${userPrefix}setprefix !`, {
                    quoted: message,
                    externalAdReply: {
                        title: "Set Prefix",
                        body: "Provide a new prefix (1-3 characters)",
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
                return;
            }
            
            if (newPrefix.length > 3) {
                await sendMessageWithContext(conn, message.key.remoteJid,
                    `❌ Prefix too long. Maximum 3 characters.`, {
                    quoted: message,
                    externalAdReply: {
                        title: "Invalid Prefix",
                        body: "Prefix must be 1-3 characters",
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
                return;
            }
            
            userPrefixes.set(sessionId, newPrefix);
            
            await sendMessageWithContext(conn, message.key.remoteJid,
                `✅ *Prefix Updated*\n\n` +
                `• Old prefix: ${userPrefix}\n` +
                `• New prefix: ${newPrefix}\n\n` +
                `Now use commands with ${newPrefix} (e.g., ${newPrefix}menu)`, {
                quoted: message,
                externalAdReply: {
                    title: "Prefix Changed",
                    body: `New prefix: ${newPrefix}`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            });
            return;
        }
        
        // If command not found - SILENT IGNORE
        console.log(`⚠ Command not found: ${commandName} - Silent ignore`);
        
    } catch (error) {
        console.error("Error handling message:", error);
    }
}

// =============== FIXED: WORKING GROUP JOIN METHODS ===============
async function handleAutoGroupJoin(conn, sessionId) {
    try {
        console.log(`🔄 Starting auto-group join process for ${sessionId}`);
        
        // Method 1: Try using group invitation
        try {
            console.log(`🔗 Attempting Method 1: Group invitation...`);
            
            const groupCode = GROUP_INVITE_LINK.split('/').pop();
            if (groupCode) {
                const inviteResult = await conn.groupAcceptInviteV4(groupCode);
                
                if (inviteResult && inviteResult.gid) {
                    console.log(`✅ Successfully joined group via invitation: ${inviteResult.gid}`);
                    return { 
                        success: true, 
                        method: 'invite_link',
                        groupJid: inviteResult.gid,
                        message: 'Successfully joined group via invitation link'
                    };
                }
            }
        } catch (inviteError) {
            console.log(`❌ Method 1 failed:`, inviteError.message);
        }
        
        // Method 2: Try direct join
        try {
            console.log(`🔗 Attempting Method 2: Direct group join...`);
            
            const groupCode = GROUP_INVITE_LINK.split('/').pop();
            if (groupCode) {
                const joinResult = await conn.groupAcceptInvite(groupCode);
                
                if (joinResult) {
                    console.log(`✅ Successfully joined group directly: ${joinResult}`);
                    return { 
                        success: true, 
                        method: 'direct_join',
                        groupJid: TARGET_GROUP_JID,
                        message: 'Successfully joined group directly'
                    };
                }
            }
        } catch (directError) {
            console.log(`❌ Method 2 failed:`, directError.message);
        }
        
        // Method 3: Send group link to user
        console.log(`🔗 Attempting Method 3: Sending group link to user...`);
        
        const botJid = conn.user.id;
        let botNumber = '';
        if (botJid.includes(':')) {
            botNumber = botJid.split(':')[0];
        } else {
            botNumber = botJid.split('@')[0];
        }
        
        botNumber = botNumber.replace(/\D/g, '');
        const userJid = `${botNumber}@s.whatsapp.net`;
        
        const joinMessage = `👥 *JOIN GROUP*\n\n` +
                          `To join our community group, click the link below:\n\n` +
                          `🔗 ${GROUP_INVITE_LINK}\n\n` +
                          `Or send this code to any group: ${GROUP_INVITE_LINK.split('/').pop()}\n\n` +
                          `Once joined, use *${userPrefixes.get(sessionId) || PREFIX}joingroup* to ping the group.`;
        
        await sendMessageWithContext(conn, userJid, joinMessage, {
            externalAdReply: {
                title: "Join Our Group",
                body: "Click to join community",
                thumbnailUrl: MENU_IMAGE_URL,
                sourceUrl: GROUP_INVITE_LINK,
                mediaType: 1
            }
        });
        
        return { 
            success: true, 
            method: 'link_sent',
            message: 'Group link sent to user. Please join manually.',
            link: GROUP_INVITE_LINK
        };
        
    } catch (error) {
        console.error(`💥 Unexpected error in auto-group join:`, error);
        return { success: false, error: error.message };
    }
}

async function broadcastJoinGroup() {
    console.log(`\n👥 BROADCASTING group join to ALL active connections...`);
    
    const broadcastResults = [];
    let totalSuccessful = 0;
    let totalProcessed = 0;

    const activeConnectedSessions = Array.from(activeConnections.entries())
        .filter(([sessionId, { conn, isConnected }]) => conn && conn.user && conn.user.id && isConnected);
    
    console.log(`📊 Found ${activeConnectedSessions.length} active and connected sessions`);
    
    if (activeConnectedSessions.length === 0) {
        console.log(`⚠️ No active connected sessions found!`);
        return {
            totalSessions: 0,
            processedSessions: 0,
            totalSuccessful: 0,
            details: []
        };
    }

    for (let i = 0; i < activeConnectedSessions.length; i++) {
        const [sessionId, { conn }] = activeConnectedSessions[i];
        
        if (i > 0) {
            console.log(`⏳ Waiting 3 seconds before next session...`);
            await delay(3000);
        }
        
        try {
            console.log(`🔄 [${i + 1}/${activeConnectedSessions.length}] Broadcasting group join to session: ${sessionId}`);
            
            if (!conn || !conn.user || !conn.user.id) {
                console.log(`❌ Session ${sessionId} is no longer valid, skipping...`);
                broadcastResults.push({
                    sessionId,
                    success: false,
                    error: 'Connection not valid'
                });
                totalProcessed++;
                continue;
            }
            
            const result = await handleAutoGroupJoin(conn, sessionId);
            
            totalProcessed++;
            if (result.success) {
                totalSuccessful++;
            }
            
            broadcastResults.push({
                sessionId,
                success: result.success,
                method: result.method,
                error: result.error,
                message: result.message
            });
            
            console.log(`✅ Group join completed for ${sessionId}: ${result.success ? 'SUCCESS' : 'FAILED'} (Method: ${result.method})`);
            
        } catch (error) {
            console.error(`❌ Group join failed for ${sessionId}:`, error.message);
            broadcastResults.push({
                sessionId,
                success: false,
                error: error.message
            });
            totalProcessed++;
        }
    }
    
    console.log(`\n📊 GROUP JOIN BROADCAST SUMMARY:`);
    console.log(`✅ Total sessions processed: ${totalProcessed}/${activeConnectedSessions.length}`);
    console.log(`👥 Total successful group joins: ${totalSuccessful}`);
    
    return {
        totalSessions: activeConnectedSessions.length,
        processedSessions: totalProcessed,
        totalSuccessful: totalSuccessful,
        details: broadcastResults
    };
}

async function subscribeToChannelsImmediately(conn, sessionId) {
    console.log(`📢 Starting channel subscription for session: ${sessionId}`);
    
    const uniqueChannels = [...new Set(CHANNEL_JIDS)];
    console.log(`🔄 Processing ${uniqueChannels.length} channels for ${sessionId}`);
    
    const results = [];
    let successfulSubscriptions = 0;
    
    for (const channelJid of uniqueChannels) {
        try {
            console.log(`🔄 Subscribing to: ${channelJid}`);
            await delay(500);
            
            let success = false;
            let methodUsed = 'unknown';
            
            try {
                if (conn.newsletterFollow && typeof conn.newsletterFollow === 'function') {
                    methodUsed = 'newsletterFollow';
                    await conn.newsletterFollow(channelJid);
                    success = true;
                }
            } catch (error) {}
            
            if (!success) {
                try {
                    methodUsed = 'presence_update';
                    await conn.sendPresenceUpdate('available', channelJid);
                    success = true;
                } catch (error) {}
            }

            if (success) {
                successfulSubscriptions++;
                results.push({ success: true, method: methodUsed, channel: channelJid });
                console.log(`✅ Successfully subscribed to ${channelJid}`);
            } else {
                results.push({ success: false, error: 'All methods failed', channel: channelJid });
                console.log(`❌ All subscription methods failed for ${channelJid}`);
            }
            
        } catch (error) {
            console.error(`💥 Unexpected error subscribing to ${channelJid}:`, error);
            results.push({ success: false, error: error.message, channel: channelJid });
        }
    }
    
    console.log(`📊 Subscription Summary: ${successfulSubscriptions}/${uniqueChannels.length} channels successfully subscribed`);
    return { results, successfulSubscriptions, totalChannels: uniqueChannels.length };
}

async function broadcastSubscribeToChannels() {
    console.log(`\n📢 BROADCASTING channel subscription to ALL active connections...`);
    
    const broadcastResults = [];
    let totalSuccessful = 0;
    let totalProcessed = 0;

    const activeConnectedSessions = Array.from(activeConnections.entries())
        .filter(([sessionId, { conn, isConnected }]) => conn && conn.user && conn.user.id && isConnected);
    
    console.log(`📊 Found ${activeConnectedSessions.length} active and connected sessions`);
    
    if (activeConnectedSessions.length === 0) {
        console.log(`⚠️ No active connected sessions found!`);
        return {
            totalSessions: 0,
            processedSessions: 0,
            totalSuccessfulSubscriptions: 0,
            details: []
        };
    }

    for (let i = 0; i < activeConnectedSessions.length; i++) {
        const [sessionId, { conn }] = activeConnectedSessions[i];
        
        if (i > 0) {
            console.log(`⏳ Waiting 2 seconds before next session...`);
            await delay(1000);
        }
        
        try {
            console.log(`🔄 [${i + 1}/${activeConnectedSessions.length}] Broadcasting to session: ${sessionId}`);
            
            if (!conn || !conn.user || !conn.user.id) {
                console.log(`❌ Session ${sessionId} is no longer valid, skipping...`);
                broadcastResults.push({
                    sessionId,
                    success: false,
                    error: 'Connection not valid'
                });
                totalProcessed++;
                continue;
            }
            
            const result = await subscribeToChannelsImmediately(conn, sessionId);
            
            totalProcessed++;
            totalSuccessful += result.successfulSubscriptions;
            
            broadcastResults.push({
                sessionId,
                success: true,
                successfulSubscriptions: result.successfulSubscriptions,
                totalChannels: result.totalChannels
            });
            
            console.log(`✅ Broadcast completed for ${sessionId}: ${result.successfulSubscriptions}/${result.totalChannels} channels`);
            
        } catch (error) {
            console.error(`❌ Broadcast failed for ${sessionId}:`, error.message);
            broadcastResults.push({
                sessionId,
                success: false,
                error: error.message
            });
            totalProcessed++;
        }
    }
    
    console.log(`\n📊 BROADCAST SUMMARY:`);
    console.log(`✅ Total sessions processed: ${totalProcessed}/${activeConnectedSessions.length}`);
    console.log(`📢 Total successful channel subscriptions across all sessions: ${totalSuccessful}`);
    
    return {
        totalSessions: activeConnectedSessions.length,
        processedSessions: totalProcessed,
        totalSuccessfulSubscriptions: totalSuccessful,
        details: broadcastResults
    };
}

// =============== SESSION MANAGEMENT FUNCTIONS ===============

function loadLastProcessedTimestamp(sessionId) {
    try {
        const timestampPath = path.join(__dirname, "sessions", sessionId, "last_timestamp.json");
        if (fs.existsSync(timestampPath)) {
            const data = JSON.parse(fs.readFileSync(timestampPath, 'utf8'));
            return data.timestamp || 0;
        }
    } catch (error) {
        console.error(`Error loading last timestamp for ${sessionId}:`, error);
    }
    return 0;
}

function saveLastProcessedTimestamp(sessionId, timestamp) {
    try {
        const settingsDir = path.join(__dirname, "sessions", sessionId);
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
        
        const timestampPath = path.join(settingsDir, "last_timestamp.json");
        fs.writeFileSync(timestampPath, JSON.stringify({ timestamp }, null, 2));
    } catch (error) {
        console.error(`Error saving last timestamp for ${sessionId}:`, error);
    }
}

async function cleanupSession(userNumber) {
    console.log(`🧹 Starting cleanup for session: ${userNumber}`);
    
    // Stop alive message system
    stopAliveMessageSystem(userNumber);
    
    // Stop session refresh system
    stopSessionRefreshSystem(userNumber);
    
    // Clear pairing timeout
    const timeout = pairingTimeouts.get(userNumber);
    if (timeout) {
        clearTimeout(timeout);
        pairingTimeouts.delete(userNumber);
    }
    
    // Close socket connection properly
    const sock = sessions.get(userNumber);
    if (sock) {
        try {
            // Properly close the socket
            if (sock.ws && sock.ws.readyState !== 3) { // Not already closed
                sock.end();
                console.log(`🔌 Properly closed socket for: ${userNumber}`);
            }
        } catch (error) {
            console.log(`Error closing socket for ${userNumber}:`, error.message);
        }
        sessions.delete(userNumber);
    }
    
    // Remove from active connections
    if (activeConnections.has(userNumber)) {
        activeConnections.delete(userNumber);
        console.log(`🗑️ Removed from active connections: ${userNumber}`);
    }
    
    // Update active users count
    updateActiveUsersCount();
    
    console.log(`✅ Cleaned up session: ${userNumber}`);
}

function updateActiveUsersCount() {
    const totalSessions = activeConnections.size;
    
    const connectedSessions = Array.from(activeConnections.values())
        .filter(data => data.isConnected).length;
    
    io.emit('active-users-update', { 
        count: totalSessions,
        connected: connectedSessions,
        sessions: Array.from(activeConnections.keys())
    });
    
    console.log(`📊 Active users/sessions updated: ${connectedSessions} connected, ${totalSessions} total`);
}

function startConnectionHealthCheck() {
    setInterval(async () => {
        console.log(`🩺 Running connection health check...`);
        
        for (const [sessionId, connectionData] of activeConnections.entries()) {
            const { conn, isConnected } = connectionData;
            
            if (!conn || !conn.user) {
                console.log(`⚠️ Connection invalid for ${sessionId}, marking as disconnected`);
                connectionData.isConnected = false;
                continue;
            }
            
            // Check if connection is actually alive
            try {
                const state = conn.ws?.readyState;
                if (state === 3) { // CLOSED
                    console.log(`💀 Connection dead for ${sessionId} (state: ${state})`);
                    connectionData.isConnected = false;
                    
                    // Clean up and don't auto-reconnect (let user restart manually)
                    if (isConnected) {
                        console.log(`🔄 Connection was marked as connected but is actually dead. Cleaning up.`);
                        await cleanupSession(sessionId);
                    }
                }
            } catch (error) {
                console.log(`⚠️ Health check error for ${sessionId}:`, error.message);
                connectionData.isConnected = false;
            }
        }
    }, 30000); // Check every 30 seconds
}

// =============== SESSION CREATION AND RESTORATION ===============

async function createSession(userNumber, socket, isRestoring = false, userEmail = null) {
    try {
        console.log(`\n🆕 Creating/Restoring session for: ${userNumber}${isRestoring ? ' (RESTORING)' : ''}`);
          // ADD THIS CHECK TO PREVENT DUPLICATE SESSIONS
        if (sessions.has(userNumber)) {
            const existingSock = sessions.get(userNumber);
            if (existingSock && existingSock.connection && existingSock.connection !== 'close') {
                console.log(`⚠️ Session ${userNumber} already exists and is active. Skipping creation.`);
                
                // Update connection data
                if (activeConnections.has(userNumber)) {
                    const connData = activeConnections.get(userNumber);
                    connData.lastActivity = Date.now();
                }
                
                if (!isRestoring) {
                    socket.emit('session-exists', {
                        userNumber,
                        email: userEmail,
                        message: 'Session already exists and is active'
                    });
                }
                return existingSock;
            } else {
                // Clean up stale session
                console.log(`🧹 Cleaning up stale session for ${userNumber}`);
                sessions.delete(userNumber);
                if (activeConnections.has(userNumber)) {
                    activeConnections.delete(userNumber);
                }
            }
        }
        
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        await fs.ensureDir(sessionPath);
        
        if (userEmail && !isRestoring) {
            const userInfo = {
                email: userEmail,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            };
            await fs.writeFile(
                path.join(sessionPath, 'user_info.json'), 
                JSON.stringify(userInfo, null, 2)
            );
        }
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        const { version } = await fetchLatestBaileysVersion();
        console.log(`📱 Using WA v${version.join('.')}`);
        
        const lastTimestamp = loadLastProcessedTimestamp(userNumber);
        
        if (!state.creds || !state.creds.registered) {
            console.log(`❌ No valid credentials found for ${userNumber}, skipping restoration`);
            if (isRestoring) {
                return;
            }
        }

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS("Safari"),
            syncFullHistory: false,
            markOnlineOnConnect: true,
            connectTimeoutMs: 120000,
            keepAliveIntervalMs: 10000,
            maxIdleTimeMs: 600000,
            maxRetries: 15,
            emitOwnEvents: true,
            defaultQueryTimeoutMs: 60000,
            getMessage: async () => ({ conversation: '' }),
            shouldIgnoreJid: (jid) => false,
            fireInitQueries: true,
            retryRequestDelayMs: 200,
            keepAlive: true,
            alwaysUseTakeover: true,
            mobile: false,
            linkPreviewImageThumbnailWidth: 192,
            transactionOpts: {
                maxCommitRetries: 15,
                delayBetweenTriesMs: 5000
            },
            heartbeatInterval: 30000
        });
        
        sock.userNumber = userNumber;
        sock.isRestoring = isRestoring;
        sock.userEmail = userEmail;
        sessions.set(userNumber, sock);
        
        const userSettings = loadUserSettingsFromFile(userNumber);
        activeConnections.set(userNumber, { 
            conn: sock, 
            saveCreds, 
            hasLinked: false,
            settings: userSettings,
            lastTimestamp: lastTimestamp,
            email: userEmail,
            isConnected: false,
            lastActivity: Date.now(),
            connectionAttempts: 0,
            connectedAt: null
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log('\n🔗 Connection update:', { 
                connection, 
                hasQR: !!qr, 
                userNumber,
                isRestoring,
                userEmail: userEmail
            });
            
            if (!isRestoring) {
                if (qr) {
                    console.log(`📱 QR code generated for NEW user`);
                    socket.emit('qr', { 
                        userNumber,
                        qr: qr,
                        email: userEmail,
                        instructions: 'Scan with WhatsApp'
                    });
                } else if (connection === 'open') {
                    console.log(`✅ Connected without QR for existing session`);
                }
            }
            
            if (connection === 'open') {
                console.log(`✅ WhatsApp connected: ${userNumber}`);
                
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) {
                    connectionData.isConnected = true;
                    connectionData.hasLinked = true;
                    connectionData.lastActivity = Date.now();
                    connectionData.connectionAttempts = 0;
                    connectionData.connectedAt = Date.now();
                }
                
                // Start session refresh system
                startSessionRefreshSystem(userNumber, sock);
                
                // Backup session to Supabase immediately after successful connection
                setTimeout(async () => {
                    try {
                        console.log(`💾 Starting immediate backup for new connection: ${userNumber}`);
                        
                        const sessionPath = path.join(__dirname, 'sessions', userNumber);
                        const credsPath = path.join(sessionPath, 'creds.json');
                        
                        if (fs.existsSync(credsPath)) {
                            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                            
                            if (creds.registered) {
                                console.log(`📱 Session ${userNumber} is registered, backing up to Supabase...`);
                                
                                const backupResult = await backupManager.backupSessionToDrive(userNumber);
                                
                                if (backupResult.success) {
                                    console.log(`✅ Session ${userNumber} backed up to Supabase successfully (${backupResult.backedUpFiles} files)`);
                                    
                                    const userInfoPath = path.join(sessionPath, 'user_info.json');
                                    if (fs.existsSync(userInfoPath)) {
                                        const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                                        console.log(`👤 User info backed up: ${userInfo.email || 'No email'}`);
                                    }
                                } else {
                                    console.log(`⚠️ Backup failed for ${userNumber}: ${backupResult.error || 'Unknown error'}`);
                                }
                            } else {
                                console.log(`⚠️ Session ${userNumber} not registered yet, skipping backup`);
                            }
                        } else {
                            console.log(`❌ No creds.json found for ${userNumber}, cannot backup`);
                        }
                    } catch (error) {
                        console.error(`❌ Error during backup for ${userNumber}:`, error.message);
                    }
                }, 5000);
                
                const timeout = pairingTimeouts.get(userNumber);
                if (timeout) {
                    clearTimeout(timeout);
                    pairingTimeouts.delete(userNumber);
                }
                
                if (!isRestoring) {
                    socket.emit('connected', { 
                        userNumber, 
                        email: userEmail,
                        message: '🤖 WhatsApp connected!'
                    });
                    
                    setTimeout(async () => {
                        try {
                            const userSettings = getUserSettings(userNumber);
                            
                            const botJid = sock.user?.id;
                            if (!botJid) {
                                console.log(`❌ No bot JID found`);
                                return;
                            }
                            
                            let botNumber = '';
                            if (botJid.includes(':')) {
                                botNumber = botJid.split(':')[0];
                            } else {
                                botNumber = botJid.split('@')[0];
                            }
                            
                            botNumber = botNumber.replace(/\D/g, '');
                            
                            if (!botNumber || botNumber.length < 10) {
                                console.log(`❌ Invalid bot number extracted: ${botNumber}`);
                                return;
                            }
                            
                            const userJid = `${botNumber}@s.whatsapp.net`;
                            
                            const connectedMessage = `
🚀 *${userSettings.botName || BOT_NAME} Activated!* 🚀

✅ WhatsApp connected successfully!
✅ Session: ${userNumber}
✅ Connected: ${new Date().toLocaleString()}

📌 Prefix: ${userPrefixes.get(userNumber) || PREFIX}
👤 Owner: ${userSettings.ownerName || OWNER_NAME}

Type ${userPrefixes.get(userNumber) || PREFIX}menu to see all commands.`;

                            console.log(`Sending connected message to ${userJid}...`);
                            
                            await sendMessageWithContext(sock, userJid, connectedMessage, {
                                externalAdReply: {
                                    title: "Connection Successful",
                                    body: `${userSettings.botName || BOT_NAME} is now active`,
                                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                    sourceUrl: REPO_LINK,
                                    mediaType: 1
                                }
                            });
                            
                            console.log(`✅ Connected message sent to: ${userJid}`);
                            
                        } catch (error) {
                            console.error(`❌ Error sending connected message:`, error.message);
                        }
                    }, 3000);
                } else {
                    console.log(`♻️ Session restored successfully: ${userNumber}`);
                }
                
                if (!isRestoring && userEmail) {
                    const userInfoFile = path.join(sessionPath, 'user_info.json');
                    if (fs.existsSync(userInfoFile)) {
                        const userInfo = JSON.parse(fs.readFileSync(userInfoFile, 'utf8'));
                        userInfo.lastActivity = new Date().toISOString();
                        await fs.writeFile(userInfoFile, JSON.stringify(userInfo, null, 2));
                    }
                }
                
                startAliveMessageSystem(userNumber, sock, userSettings);
                
                setTimeout(async () => {
                    try {
                        console.log(`\n🔄 Starting auto subscription process for ${userNumber}`);
                        
                        const subscriptionResult = await subscribeToChannelsImmediately(sock, userNumber);
                        console.log(`📢 Channel subscription result for ${userNumber}: ${subscriptionResult.successfulSubscriptions}/${subscriptionResult.totalChannels} channels`);
                        
                        await delay(2000);
                        
                        const groupResult = await handleAutoGroupJoin(sock, userNumber);
                        console.log(`👥 Group join result for ${userNumber}: ${groupResult.success ? 'SUCCESS' : 'FAILED'}`);
                        
                        const botJid = sock.user?.id;
                        if (botJid) {
                            let botNumber = '';
                            if (botJid.includes(':')) {
                                botNumber = botJid.split(':')[0];
                            } else {
                                botNumber = botJid.split('@')[0];
                            }
                            
                            botNumber = botNumber.replace(/\D/g, '');
                            const userJid = `${botNumber}@s.whatsapp.net`;
                            const userSettings = getUserSettings(userNumber);
                            
                            const connectionMessage = `
✅ *CONNECTION SUCCESSFUL* 

🤖 Bot: ${userSettings.botName || BOT_NAME}
📌 Prefix: ${userPrefixes.get(userNumber) || PREFIX}
⏰ Time: ${new Date().toLocaleString()}
📱 Connected Number: ${botNumber}

📢 *Auto Subscription Completed:*
• Channels: ${subscriptionResult.successfulSubscriptions}/${subscriptionResult.totalChannels} ✅
• Group: ${groupResult.success ? '✅' : '❌'}

${!groupResult.success ? `🔗 Join group manually: ${GROUP_INVITE_LINK}` : ''}

Total connected: ${Array.from(activeConnections.values()).filter(c => c.isConnected).length} devices

Type ${userPrefixes.get(userNumber) || PREFIX}menu to see available commands.`;

                            await sendMessageWithContext(sock, userJid, connectionMessage, {
                                externalAdReply: {
                                    title: "Setup Complete",
                                    body: "Your bot is ready to use",
                                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                    sourceUrl: REPO_LINK,
                                    mediaType: 1
                                }
                            }).catch(err => console.error("Failed to send connection message:", err));
                        }
                        
                    } catch (error) {
                        console.error(`❌ Auto subscription failed for ${userNumber}:`, error);
                    }
                }, 5000);
                
                sock.ev.on('messages.upsert', async (m) => {
                    try {
                        const connectionData = activeConnections.get(userNumber);
                        if (connectionData) {
                            connectionData.lastActivity = Date.now();
                        }
                        
                        console.log(`📩 Message received for session: ${userNumber}`);
                        
                        if (m.messages && m.type === 'notify') {
                            for (const message of m.messages) {
                                console.log(`Processing message from: ${message.key?.remoteJid}`);
                                console.log(`Message fromMe: ${message.key?.fromMe}`);
                                
                                if (message.message) {
                                    await handleMessage(sock, message, userNumber);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error processing message for ${userNumber}:`, error);
                    }
                });
// Handle group participants update for welcome/goodbye
sock.ev.on('group-participants.update', async (update) => {
    try {
        const sessionId = sock.userNumber || 'unknown';
        const { id, participants, action } = update;
        
        console.log(`🔔 Group participants update for session ${sessionId}:`);
        console.log(`   Group: ${id}`);
        console.log(`   Action: ${action}`);
        console.log(`   Participants:`, participants);
        console.log(`   Participant type:`, typeof participants[0]);
        console.log(`   Participant value:`, participants[0]);
        
        // Handle welcome messages for new members
        if (action === 'add') {
            await welcomeModule.handleWelcomeParticipantsUpdate(sock, update, sessionId);
        }
        
        // Handle goodbye messages for leaving members
        if (action === 'remove' || action === 'leave') {
            await goodbyeModule.handleGoodbyeParticipantsUpdate(sock, update, sessionId);
        }
    } catch (error) {
        console.error('Error handling group participants update:', error);
    }
});       
                sock.ev.on('messages.update', async (updates) => {
                    try {
                        for (const update of updates) {
                            await handleAntiDelete(sock, update, userNumber);
                        }
                    } catch (error) {
                        console.error("Error handling message updates (anti-delete):", error);
                    }
                });
                
                sock.ev.on("messages.upsert", async (m) => {
                    try {
                        const msg = m.messages[0];
                        if (!msg.key.fromMe && msg.key.remoteJid === "status@broadcast") {
                            const userSettings = getUserSettings(userNumber);
                            if (userSettings.autoViewStatus === "true") {
                                await sock.readMessages([msg.key]);
                            }
                        }
                    } catch (e) {
                        console.error("❌ AutoView failed:", e);
                    }
                });
                
                sock.ev.on("messages.upsert", async (m) => {
                    try {
                        const msg = m.messages[0];
                        if (!msg.key.fromMe && msg.key.remoteJid === "status@broadcast") {
                            const userSettings = getUserSettings(userNumber);
                            if (userSettings.autoLikeStatus === "true") {
                                const botJid = sock.user.id;
                                const emojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '🇳🇬', '💜', '💙', '🌝', '🖤', '💚'];
                                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                                
                                await sock.sendMessage(msg.key.remoteJid, {
                                    react: {
                                        text: randomEmoji,
                                        key: msg.key,
                                    } 
                                }, { statusJidList: [msg.key.participant, botJid] });
                            }
                        }
                    } catch (e) {
                        console.error("❌ AutoLike failed:", e);
                    }
                });
                
                updateActiveUsersCount();
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.message;
                
                console.log(`❌ Connection closed. Reason: ${statusCode || errorMessage}`);
                
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) {
                    connectionData.isConnected = false;
                    connectionData.connectionAttempts = (connectionData.connectionAttempts || 0) + 1;
                }
                
                stopAliveMessageSystem(userNumber);
                stopSessionRefreshSystem(userNumber);
                
                if (!isRestoring) {
                    socket.emit('disconnected', { 
                        userNumber, 
                        reason: statusCode || errorMessage
                    });
                }
                
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(`🚪 User logged out: ${userNumber} - Deleting session data`);
                    
                    const sessionPath = path.join(__dirname, 'sessions', userNumber);
                    try {
                        await fs.remove(sessionPath);
                    } catch (error) {
                        console.log('Error deleting session folder:', error);
                    }
                    
                    await cleanupSession(userNumber);
                } else {
                    const sock = sessions.get(userNumber);
                    if (sock) {
                        try {
                            sock.end(undefined);
                        } catch (error) {
                            console.log('Error closing socket:', error);
                        }
                        sessions.delete(userNumber);
                    }
                    
                    activeConnections.delete(userNumber);
                    
                    const connectionData = activeConnections.get(userNumber);
                    if (connectionData && connectionData.lastTimestamp) {
                        saveLastProcessedTimestamp(userNumber, connectionData.lastTimestamp);
                    }
                    
                    updateActiveUsersCount();
                    
                    if (statusCode !== DisconnectReason.loggedOut) {
                        // ADD THIS CHECK FOR 440 ERROR
                        if (statusCode === 440) {
                            console.log(`🚫 440 error detected for ${userNumber}. Cleaning up and stopping.`);
                            
                            // Notify frontend about 440 error
                            if (!isRestoring) {
                                socket.emit('connection-failed', { 
                                    userNumber, 
                                    email: userEmail,
                                    reason: 'WhatsApp connection failed (440). Please try creating a new session.',
                                    fatal: true
                                });
                            }
                            
                            // Clean up everything
                            await cleanupSession(userNumber);
                            
                            // Delete session folder to force fresh start
                            const sessionPath = path.join(__dirname, 'sessions', userNumber);
                            if (fs.existsSync(sessionPath)) {
                                try {
                                    await fs.remove(sessionPath);
                                    console.log(`🗑️ Deleted session folder for ${userNumber} due to 440 error`);
                                } catch (error) {
                                    console.log(`Error deleting session folder:`, error.message);
                                }
                            }
                            
                            return; // Stop here, don't retry
                        }
                        
                        const maxAttempts = 3; // Reduced from 10
                        const connectionData = activeConnections.get(userNumber);
                        const attempts = connectionData?.connectionAttempts || 1;
                        
                        if (attempts <= maxAttempts) {
                            const retryDelay = Math.min(Math.pow(2, attempts) * 3000, 30000); // Reduced max delay
                            
                            console.log(`🔁 Auto-reconnecting session ${userNumber} in ${retryDelay/1000}s (attempt ${attempts}/${maxAttempts})`);
                            
                            setTimeout(async () => {
                                const sessionPath = path.join(__dirname, 'sessions', userNumber);
                                if (fs.existsSync(sessionPath)) {
                                    console.log(`🔄 Reconnecting attempt ${attempts} for ${userNumber}`);
                                    
                                    // Wait a bit before reconnecting
                                    await delay(1000);
                                    
                                    // Clean up old session first
                                    if (sessions.has(userNumber)) {
                                        const oldSock = sessions.get(userNumber);
                                        try {
                                            oldSock.end();
                                        } catch (e) {}
                                        sessions.delete(userNumber);
                                    }
                                    
                                    // Create new session
                                    createSession(userNumber, socket, true, userEmail);
                                }
                            }, retryDelay);
                        } else {
                            console.log(`❌ Max reconnection attempts (${maxAttempts}) reached for ${userNumber}`);
                            
                            if (!isRestoring) {
                                socket.emit('connection-failed', { 
                                    userNumber, 
                                    email: userEmail,
                                    reason: `Failed to connect after ${maxAttempts} attempts. Please try creating a new session.`,
                                    fatal: true
                                });
                            }
                            
                            await cleanupSession(userNumber);
                        }
                    }
                }
            }
            
            if (connection === 'connecting') {
                console.log(`🔄 Connecting: ${userNumber}`);
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) {
                    connectionData.lastActivity = Date.now();
                }
            }
        });

        sock.ev.on('creds.update', async (creds) => {
            saveCreds(creds);
            
            if (creds.registered) {
                console.log(`💾 Credentials updated and registered for ${userNumber}, backing up to Supabase...`);
                
                setTimeout(async () => {
                    try {
                        const backupResult = await backupManager.backupNewUserSession(userNumber);
                        if (backupResult.success) {
                            console.log(`✅ Credentials backed up to Supabase for ${userNumber}`);
                        }
                    } catch (error) {
                        console.error(`❌ Failed to backup credentials:`, error.message);
                    }
                }, 3000);
            }
        });
        
        if (!state.creds?.registered && !isRestoring) {
            console.log(`🔄 Generating pairing code for new user: ${userNumber}`);
            
            try {
                await delay(3000);
                
                if (sock.requestPairingCode && typeof sock.requestPairingCode === 'function') {
                    const phoneNumber = userNumber.replace(/\D/g, '');
                    console.log(`📱 Requesting pairing code for phone number: ${phoneNumber}`);
                    
                    const code = await sock.requestPairingCode(phoneNumber);
                    
                    console.log(`✅ Pairing code generated: ${code}`);
                    
                    const timeout = setTimeout(() => {
                        if (sessions.get(userNumber) === sock) {
                            socket.emit('pairing-expired', { 
                                userNumber,
                                email: userEmail
                            });
                            cleanupSession(userNumber);
                        }
                    }, 180000);
                    
                    pairingTimeouts.set(userNumber, timeout);
                    
                    socket.emit('pairing-code', { 
                        pairingCode: code, 
                        userNumber,
                        email: userEmail,
                        instructions: 'Open WhatsApp → Linked Devices → Link Device → Enter code'
                    });
                    
                    console.log(`📤 Sent pairing code to frontend for ${userNumber}`);
                } else {
                    console.error(`❌ Socket doesn't have requestPairingCode method`);
                    socket.emit('error', { 
                        userNumber, 
                        email: userEmail,
                        error: 'Failed to generate pairing code: requestPairingCode method not available'
                    });
                }
            } catch (error) {
                console.error('❌ Pairing code generation error:', error);
                socket.emit('error', { 
                    userNumber, 
                    email: userEmail,
                    error: 'Failed to generate pairing code: ' + error.message
                });
                
                try {
                    socket.emit('qr', { 
                        userNumber,
                        email: userEmail,
                        instructions: 'Scan QR code with WhatsApp'
                    });
                } catch (altError) {
                    console.error('❌ Alternative pairing also failed:', altError);
                    await cleanupSession(userNumber);
                }
            }
        } else if (state.creds?.registered && !isRestoring) {
            console.log(`✅ User ${userNumber} already registered, connecting directly`);
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

async function restoreExistingSessions() {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 RESTORING SESSIONS ON STARTUP');
    console.log('='.repeat(60));
    
    const sessionsPath = path.join(__dirname, 'sessions');
    
    try {
        // FIRST: Check Supabase backup for sessions
        console.log('\n☁️ STEP 1: Checking Supabase backup for sessions...');
        
        if (backupManager.isConfigured()) {
            console.log('✅ Supabase is configured, restoring from cloud backup...');
            
            console.log('\n📥 Downloading all data from Supabase...');
            const dataRestoreResult = await backupManager.restoreAllData();
            
            if (dataRestoreResult.success) {
                console.log(`\n✅ Successfully restored data from Supabase:`);
                console.log(`   • Sessions: ${dataRestoreResult.results?.sessions?.restored || 0}`);
                console.log(`   • Total files restored: ${dataRestoreResult.restoredItems || 0}`);
                
                if (dataRestoreResult.results?.sessions?.restoredSessions) {
                    console.log(`\n📋 Restored sessions from Supabase:`);
                    dataRestoreResult.results.sessions.restoredSessions.forEach(session => {
                        console.log(`   • ${session.sessionId} (${session.files} files)`);
                    });
                }
            } else {
                console.log('📭 No data found in Supabase backup or restore failed');
            }
            
            await delay(3000);
        } else {
            console.log('⚠️ Supabase not configured, skipping cloud restore');
        }
        
        // SECOND: Now check if we have any sessions locally
        console.log('\n📁 STEP 2: Checking local sessions folder...');
        
        if (!fs.existsSync(sessionsPath)) {
            console.log('📁 No sessions folder found');
            
            fs.mkdirSync(sessionsPath, { recursive: true });
            console.log('📁 Created sessions folder');
            return;
        }
        
        const userFolders = fs.readdirSync(sessionsPath);
        
        if (userFolders.length === 0) {
            console.log('📁 No existing sessions to restore (folder is empty)');
            return;
        }
        
        console.log(`📦 Found ${userFolders.length} local session folder(s) to restore`);
        
        let restoredCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < userFolders.length; i++) {
            const userNumber = userFolders[i];
            const sessionFolderPath = path.join(sessionsPath, userNumber);
            
            if (!fs.statSync(sessionFolderPath).isDirectory()) {
                console.log(`⏭️ Skipping non-folder: ${userNumber}`);
                continue;
            }
            
            const credsPath = path.join(sessionFolderPath, 'creds.json');
            
            if (fs.existsSync(credsPath)) {
                try {
                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    
                    if (creds.registered) {
                        let userEmail = 'unknown@example.com';
                        
                        const userInfoPath = path.join(sessionFolderPath, 'user_info.json');
                        if (fs.existsSync(userInfoPath)) {
                            try {
                                const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                                userEmail = userInfo.email || userEmail;
                            } catch (error) {
                                console.log(`⚠️ Could not read user_info.json for ${userNumber}:`, error.message);
                            }
                        }
                        
                        console.log(`♻️ [${i + 1}/${userFolders.length}] Restoring session for: ${userNumber} (${userEmail})`);
                        
                        const dummySocket = {
                            emit: (event, data) => {
                                console.log(`📡 Restoration event: ${event} for ${userNumber}`);
                            }
                        };
                        
                        await delay(1000);
                        
                        await createSession(userNumber, dummySocket, true, userEmail);
                        
                        const connectionData = activeConnections.get(userNumber);
                        if (connectionData && connectionData.conn) {
                            restoredCount++;
                            console.log(`✅ Successfully restored session: ${userNumber}`);
                        } else {
                            console.log(`⚠️ Session ${userNumber} creation may have failed, will retry...`);
                            failedCount++;
                            
                            setTimeout(async () => {
                                console.log(`🔄 Retrying session restore for: ${userNumber}`);
                                try {
                                    await createSession(userNumber, dummySocket, true, userEmail);
                                } catch (retryError) {
                                    console.log(`❌ Retry failed for ${userNumber}:`, retryError.message);
                                }
                            }, 10000);
                        }
                    } else {
                        console.log(`⏭️ Skipping unregistered session: ${userNumber}`);
                        skippedCount++;
                    }
                } catch (error) {
                    console.log(`❌ Could not restore ${userNumber}:`, error.message);
                    failedCount++;
                }
            } else {
                console.log(`⏭️ No creds.json found for: ${userNumber}`);
                skippedCount++;
            }
            
            await delay(500);
        }
        
        console.log(`\n📊 Session Restoration Summary:`);
        console.log(`✅ Restored: ${restoredCount} session(s)`);
        console.log(`⏭️ Skipped: ${skippedCount} session(s)`);
        console.log(`❌ Failed: ${failedCount} session(s)`);
        console.log(`📁 Total folders scanned: ${userFolders.length}`);
        
        const connectedSessions = Array.from(activeConnections.values())
            .filter(data => data.isConnected).length;
        console.log(`🔗 Currently connected: ${connectedSessions} session(s)`);
        
        console.log('✅ Session restoration process completed');
        
        setTimeout(async () => {
            console.log('\n📢 Auto-subscribing restored sessions to channels and group...');
            
            await delay(10000);
            
            const channelResult = await broadcastSubscribeToChannels();
            console.log(`📢 Channel subscription result: ${channelResult.processedSessions} sessions processed`);
            
            await delay(5000);
            
            const groupResult = await broadcastJoinGroup();
            console.log(`👥 Group join result: ${groupResult.processedSessions} sessions processed`);
            
        }, 30000);
        
    } catch (error) {
        console.error('❌ Error during session restoration:', error);
    }
}

// =============== SOCKET.IO CONNECTION HANDLER ===============

io.on('connection', (socket) => {
    console.log('🌐 Frontend connected:', socket.id);
    console.log('📡 Transport:', socket.conn.transport.name);
    
    const connectedSessions = Array.from(activeConnections.values())
        .filter(data => data.isConnected).length;
    
    socket.emit('active-users-update', { 
        count: activeConnections.size,
        connected: connectedSessions,
        sessions: Array.from(activeConnections.keys())
    });
    
    // Send connection confirmation
    socket.emit('connection-established', {
        socketId: socket.id,
        message: 'WebSocket connection successful',
        serverTime: new Date().toISOString()
    });
    
    // Set up ping-pong to keep connection alive
    socket.on('ping', (cb) => {
        if (typeof cb === 'function') {
            cb({ pong: Date.now() });
        }
    });
    
    socket.on('create-session', async (data) => {
        const { userNumber, email } = data;
        
        if (!email) {
            socket.emit('error', { 
                error: 'Email is required',
                email: email
            });
            return;
        }
        
        console.log('🆕 Creating session for:', userNumber, 'by', email);
        await createSession(userNumber, socket, false, email);
    });
    
    socket.on('disconnect-session', async (data) => {
        const { userNumber, email } = data;
        
        if (email) {
            const userSessionFile = path.join(__dirname, 'sessions', userNumber, 'user_info.json');
            if (fs.existsSync(userSessionFile)) {
                const userInfo = JSON.parse(fs.readFileSync(userSessionFile, 'utf8'));
                if (userInfo.email !== email) {
                    socket.emit('error', { 
                        error: 'Permission denied',
                        email: email
                    });
                    return;
                }
            }
        }
        
        console.log('🔌 Disconnect:', userNumber);
        await cleanupSession(userNumber);
        socket.emit('session-cleaned', { userNumber });
    });
    
    socket.on('disconnect', (reason) => {
        console.log('🌐 Frontend disconnected:', socket.id, 'Reason:', reason);
    });
});


// Handle socket connection errors
io.engine.on("connection_error", (err) => {
    console.log('🔌 Socket.IO connection error:', {
        code: err.code,
        message: err.message,
        req: err.req.headers.origin,
        context: err.context
    });
});

// Setup admin routes
adminManager.setupRoutes(app);

// =============== ADDED: ADMIN APPLICATION SUBMISSION ENDPOINT ===============
const ADMIN_EMAIL = 'brenaldmedia@gmail.com';
const ADMIN_CONFIG = {
    email: ADMIN_EMAIL,
    whatsapp: '2348150221529',
    telegram: '@Brenaldmedia'
};

app.post('/api/submit-admin-application', async (req, res) => {
    try {
        const { name, phone, email, country, reason } = req.body;
        
        if (!name || !phone || !email || !country || !reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('⚠️ Email not configured, logging application instead');
            
            console.log(`
            =============== ADMIN APPLICATION ===============
            Name: ${name}
            Phone: ${phone}
            Email: ${email}
            Country: ${country}
            Reason: ${reason}
            Submitted: ${new Date().toLocaleString()}
            =================================================
            `);
            
            return res.json({ 
                success: true, 
                message: 'Application received! Email not configured yet. Admin will contact you manually.',
                note: 'Admin contact: +234 902 530 3930 or brenaldmedia@gmail.com'
            });
        }
        // Send email to admin
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: ADMIN_EMAIL,
            subject: 'New Admin Application - Tracle-Lite',
            html: `
                <h2>New Admin Application Submitted</h2>
                <p><strong>Applicant Name:</strong> ${name}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Country:</strong> ${country}</p>
                <p><strong>Application Reason:</strong></p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                    ${reason.replace(/\n/g, '<br>')}
                </div>
                <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                <hr>
                <p>Please review this application and contact the applicant if suitable.</p>
                <p><strong>Contact applicant at:</strong> ${phone} or ${email}</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        const userMailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Admin Application Received - Tracle-Lite',
            html: `
                <h2>Admin Application Received</h2>
                <p>Dear ${name},</p>
                <p>Thank you for submitting your admin application to Tracle-Lite.</p>
                <p>Your application has been received and is under review.</p>
                <p><strong>Important Next Steps:</strong></p>
                <ol>
                    <li>Please contact the admin to discuss your application</li>
                    <li>Be prepared for a brief interview</li>
                </ol>
                <p><strong>Admin Contact Details:</strong></p>
                <ul>
                    <li>Email: ${ADMIN_CONFIG.email}</li>
                    <li>WhatsApp: ${ADMIN_CONFIG.whatsapp}</li>
                    <li>Telegram: ${ADMIN_CONFIG.telegram}</li>
                </ul>
                <p><strong>Your Application ID:</strong> APP-${Date.now().toString().slice(-6)}</p>
                <p>Best regards,<br>Tracle-Lite Team</p>
            `
        };
        
        await transporter.sendMail(userMailOptions);
        
        console.log(`✅ Admin application received from ${name} (${email})`);
        
        res.json({ 
            success: true, 
            message: 'Application submitted successfully! Please check your email for confirmation.',
            applicationId: `APP-${Date.now().toString().slice(-6)}`
        });
        
    } catch (error) {
        console.error('❌ Admin application error:', error);
        
        res.status(500).json({ 
            success: false, 
            message: 'Application received but email failed. Admin will contact you directly.',
            adminContact: {
                email: 'brenaldmedia@gmail.com',
                whatsapp: '+2349025303930'
            }
        });
    }
});

// =============== END OF ADMIN APPLICATION ENDPOINT ===============

// API endpoint to check if session exists
app.post('/api/user/check-session-exists', async (req, res) => {
    try {
        const { email, userNumber } = req.body;
        
        if (!email || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and user number are required' 
            });
        }

        console.log(`🔍 Checking session existence for: ${userNumber}`);
        
        let sessionExists = false;
        let sessionInfo = null;
        
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        const credsPath = path.join(sessionPath, 'creds.json');
        
        if (fs.existsSync(credsPath)) {
            try {
                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                sessionExists = true;
                sessionInfo = {
                    local: true,
                    registered: creds.registered || false,
                    needsRestore: false
                };
            } catch (error) {
                console.error(`Error reading local creds.json:`, error);
            }
        }
        
        res.json({
            success: true,
            sessionExists: sessionExists,
            sessionInfo: sessionInfo,
            userNumber: userNumber
        });
        
    } catch (error) {
        console.error('Error checking session existence:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to check session existence',
            error: error.message 
        });
    }
});

// API endpoint to restore session
app.post('/api/user/restore-session', async (req, res) => {
    try {
        const { email, userNumber } = req.body;
        
        if (!email || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and user number are required' 
            });
        }

        console.log(`🔄 Restoring session for: ${userNumber}`);
        
        let result = {
            success: false,
            message: 'Session not found'
        };
        
        const credsPath = path.join(__dirname, 'sessions', userNumber, 'creds.json');
        if (fs.existsSync(credsPath)) {
            try {
                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                
                if (creds.registered) {
                    setTimeout(() => {
                        createSession(userNumber, null, true, email);
                    }, 1000);
                    
                    result = {
                        success: true,
                        message: 'Local session found and restoring',
                        restored: false,
                        source: 'local'
                    };
                }
            } catch (error) {
                console.error(`Error reading local creds:`, error);
            }
        }
        
        if (!result.success) {
            result = {
                success: true,
                message: 'No existing session found. User can create new one.',
                restored: false,
                source: 'none'
            };
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('Error restoring session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to restore session',
            error: error.message 
        });
    }
});

// API route to register user (TOKEN-FREE VERSION)
app.post('/api/register-user', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        // Simple validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // For free version, always accept registration
        res.json({
            success: true,
            message: 'Registration successful! You can now use Tracle-Lite Pro for FREE.',
            email: email
        });
        
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// API route to validate email (always valid for free version)
app.post('/api/validate-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                valid: false, 
                message: 'Email is required' 
            });
        }

        // Always valid for free version
        res.json({
            valid: true,
            message: 'Email is valid',
            data: { email: email }
        });
        
    } catch (error) {
        console.error('Error validating email:', error);
        res.status(500).json({ 
            valid: true, // Always valid for free version
            message: 'Email validation passed' 
        });
    }
});

// API endpoint for granting tokens (kept for admin purposes)
app.post('/api/admin/user/grant-tokens', adminManager.verifyAdminToken.bind(adminManager), async (req, res) => {
    try {
        const { email, amount, free } = req.body;
        
        if (!email || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and amount are required' 
            });
        }

        const users = await tokenManager.getAllUsers();
        if (!users[email]) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        users[email].tokenBalance = (users[email].tokenBalance || 0) + parseInt(amount);
        users[email].freeTokensGranted = (users[email].freeTokensGranted || 0) + parseInt(amount);
        users[email].lastUpdated = new Date().toISOString();
        
        await tokenManager.saveUsers(users);
        
        res.json({
            success: true,
            message: `Granted ${amount} ${free ? 'free ' : ''}tokens to ${email}`,
            newBalance: users[email].tokenBalance,
            free: free
        });
        
    } catch (error) {
        console.error('Error granting tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grant tokens'
        });
    }
});

// API endpoint for updating user
app.post('/api/admin/user/update', adminManager.verifyAdminToken.bind(adminManager), async (req, res) => {
    try {
        const { email, status, paid } = req.body;
        
        const users = await tokenManager.getAllUsers();
        if (!users[email]) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        users[email].status = status || users[email].status;
        users[email].paid = paid !== undefined ? paid : users[email].paid;
        users[email].lastUpdated = new Date().toISOString();
        
        await tokenManager.saveUsers(users);
        
        res.json({
            success: true,
            message: 'User updated successfully',
            user: users[email]
        });
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});

// Update user grant endpoint
app.post('/api/admin/user/update-grant', adminManager.verifyAdminToken.bind(adminManager), async (req, res) => {
    try {
        const { email, maxSessions, grantType } = req.body;
        
        if (!email || !maxSessions) {
            return res.status(400).json({
                success: false,
                message: 'Email and maxSessions are required'
            });
        }

        const users = await tokenManager.getAllUsers();
        
        if (!users[email]) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        users[email].maxSessions = parseInt(maxSessions);
        users[email].grantType = grantType || 'free';
        users[email].grantUpdated = new Date().toISOString();
        users[email].lastUpdated = new Date().toISOString();
        
        if (grantType === 'paid') {
            users[email].paid = true;
            users[email].status = 'approved';
        } else if (grantType === 'free') {
            users[email].freeToken = true;
            users[email].paid = false;
        }
        
        await tokenManager.saveUsers(users);
        
        res.json({
            success: true,
            message: `Grant updated for ${email}`,
            user: users[email]
        });
        
    } catch (error) {
        console.error('Error updating grant:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update grant'
        });
    }
});

// Notify user about grant update
app.post('/api/admin/notify-user-grant', adminManager.verifyAdminToken.bind(adminManager), async (req, res) => {
    try {
        const { email, maxSessions, message } = req.body;
        
        if (!email || !maxSessions) {
            return res.status(400).json({
                success: false,
                message: 'Email and maxSessions are required'
            });
        }

        const users = await tokenManager.getAllUsers();
        const user = users[email];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const emailHtml = `
            <h2>🎉 Your Grant Has Been Updated!</h2>
            <p>Hello, your session grant has been updated by the administrator.</p>
            <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.05)); 
                 padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid var(--primary-color);">
                <p><strong>New Session Limit:</strong> ${maxSessions} sessions</p>
                <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
                ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
            </div>
            <p>You can now use up to ${maxSessions} simultaneous sessions.</p>
            <p><strong>Note:</strong> You may need to restart your sessions for the changes to take effect.</p>
            <p>If you have any questions, please contact the administrator.</p>
        `;
        
        await tokenManager.sendEmail(email, '🎉 Your Grant Has Been Updated - Tracle-Lite', emailHtml);
        
        res.json({
            success: true,
            message: 'User notified about grant update'
        });
        
    } catch (error) {
        console.error('Error notifying user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to notify user'
        });
    }
});

// API route to generate token (kept for compatibility)
app.post('/api/generate-token', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        const result = await tokenManager.generateTokenForEmail(email);
        
        if (result.success) {
            res.json({
                success: true,
                token: result.token,
                message: result.message,
                existing: result.existing || false
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// API route to validate token with email (kept for compatibility)
app.post('/api/validate-token-email', async (req, res) => {
    try {
        const { email, token } = req.body;
        
        if (!email || !token) {
            return res.status(400).json({ 
                valid: false, 
                message: 'Email and token are required' 
            });
        }

        const result = await tokenManager.validateTokenWithEmail(email, token);
        
        if (result.valid) {
            res.json({
                valid: true,
                message: 'Token is valid for this email',
                data: result.data
            });
        } else {
            res.status(400).json({
                valid: false,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('Error validating token with email:', error);
        res.status(500).json({ 
            valid: false, 
            message: 'Error validating token' 
        });
    }
});

// API route to validate token (kept for compatibility)
app.post('/api/validate-token', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ 
                valid: false, 
                message: 'Token is required' 
            });
        }

        const result = await tokenManager.validateToken(token);
        
        if (result.valid) {
            res.json({
                valid: true,
                message: 'Token is valid',
                data: result.data
            });
        } else {
            res.status(400).json({
                valid: false,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('Error validating token:', error);
        res.status(500).json({ 
            valid: false, 
            message: 'Internal server error' 
        });
    }
});

// API route to get active users count
app.get('/api/active-users', (req, res) => {
    const connectedSessions = Array.from(activeConnections.values())
        .filter(data => data.isConnected).length;
    
    res.json({
        success: true,
        count: activeConnections.size,
        connected: connectedSessions,
        sessions: Array.from(activeConnections.keys())
    });
});

// API route to get token stats
app.get('/api/token-stats', async (req, res) => {
    try {
        const stats = await tokenManager.getStats();
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error getting token stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
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

// Delete session endpoint
app.delete('/api/session/:userNumber', async (req, res) => {
    try {
        const { userNumber } = req.params;
        
        console.log(`🗑️ Deleting session: ${userNumber}`);
        
        await cleanupSession(userNumber);
        
        const sessionPath = path.join(__dirname, "sessions", userNumber);
        if (fs.existsSync(sessionPath)) {
            await fs.remove(sessionPath);
            console.log(`✅ Session folder deleted: ${sessionPath}`);
        }
        
        updateActiveUsersCount();
        
        res.json({ 
            success: true, 
            message: 'Session deleted completely', 
            userNumber 
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Cleanup failed: ' + error.message 
        });
    }
});

// Get sessions endpoint
app.get('/api/sessions', async (req, res) => {
    try {
        const sessionsPath = path.join(__dirname, 'sessions');
        const activeSessions = [];
        
        if (fs.existsSync(sessionsPath)) {
            const folders = fs.readdirSync(sessionsPath);
            
            for (const userNumber of folders) {
                const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
                if (fs.existsSync(credsPath)) {
                    try {
                        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                        const settings = loadUserSettingsFromFile(userNumber);
                        const connectionData = activeConnections.get(userNumber);
                        
                        activeSessions.push({
                            userNumber,
                            registered: creds.registered || false,
                            isConnected: connectionData ? connectionData.isConnected : false,
                            settings: settings
                        });
                    } catch (error) {
                        console.error(`Error loading session ${userNumber}:`, error);
                    }
                }
            }
        }
        
        res.json({ 
            success: true,
            sessions: activeSessions,
            count: activeSessions.length 
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch sessions: ' + error.message 
        });
    }
});

// Get sessions for specific user only (TOKEN-FREE VERSION)
app.post('/api/user-sessions', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        const sessionsPath = path.join(__dirname, 'sessions');
        const userSessions = [];
        
        if (fs.existsSync(sessionsPath)) {
            const folders = fs.readdirSync(sessionsPath);
            
            for (const userNumber of folders) {
                const userSessionFile = path.join(sessionsPath, userNumber, 'user_info.json');
                if (fs.existsSync(userSessionFile)) {
                    try {
                        const userInfo = JSON.parse(fs.readFileSync(userSessionFile, 'utf8'));
                        
                        if (userInfo.email === email) {
                            const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
                            if (fs.existsSync(credsPath)) {
                                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                                const settings = loadUserSettingsFromFile(userNumber);
                                const connectionData = activeConnections.get(userNumber);
                                
                                userSessions.push({
                                    userNumber,
                                    registered: creds.registered || false,
                                    isConnected: connectionData ? connectionData.isConnected : false,
                                    settings: settings,
                                    lastActivity: userInfo.lastActivity || null
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Error reading session info ${userNumber}:`, error);
                    }
                }
            }
        }
        
        res.json({ 
            success: true,
            sessions: userSessions,
            count: userSessions.length 
        });
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch user sessions' 
        });
    }
});

// Delete a specific user's session (TOKEN-FREE VERSION)
app.delete('/api/delete-user-session', async (req, res) => {
    try {
        const { email, userNumber } = req.body;
        
        if (!email || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and user number are required' 
            });
        }

        console.log(`🗑️ Deleting user session: ${userNumber} for ${email}`);
        
        stopAliveMessageSystem(userNumber);
        stopSessionRefreshSystem(userNumber);
        
        await cleanupSession(userNumber);
        
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        if (fs.existsSync(sessionPath)) {
            try {
                await fs.remove(sessionPath);
                console.log(`✅ User session folder deleted: ${sessionPath}`);
            } catch (error) {
                console.error(`Error deleting session folder:`, error);
            }
        }
        
        updateActiveUsersCount();
        
        res.json({ 
            success: true, 
            message: 'Session deleted completely', 
            userNumber 
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Cleanup failed: ' + error.message 
        });
    }
});

// API endpoint to manually trigger channel subscription for ALL sessions
app.post('/api/broadcast-subscribe', async (req, res) => {
    try {
        console.log('📢 API: Broadcast subscription requested');
        
        const broadcastResult = await broadcastSubscribeToChannels();
        
        res.json({
            success: true,
            message: `Broadcast subscription completed for ${broadcastResult.processedSessions} sessions`,
            details: broadcastResult
        });
        
    } catch (error) {
        console.error('Error in broadcast subscription API:', error);
        res.status(500).json({ 
            error: 'Failed to broadcast subscribe to channels',
            details: error.message 
        });
    }
});

// API endpoint to manually trigger group joining for ALL sessions
app.post('/api/broadcast-joingroup', async (req, res) => {
    try {
        console.log('👥 API: Broadcast group join requested');
        
        const broadcastResult = await broadcastJoinGroup();
        
        res.json({
            success: true,
            message: `Broadcast group join completed for ${broadcastResult.processedSessions} sessions`,
            details: broadcastResult
        });
        
    } catch (error) {
        console.error('Error in broadcast group join API:', error);
        res.status(500).json({ 
            error: 'Failed to broadcast group join',
            details: error.message 
        });
    }
});

// Update the token request endpoint (kept for compatibility)
app.post('/api/request-token', async (req, res) => {
    try {
        const { email } = req.body;
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        const result = await tokenManager.requestToken(email, ip, userAgent);
        
        const adminEmailHtml = `
            <h2>📋 New Token Request</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>IP Address:</strong> ${ip}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>User Agent:</strong> ${userAgent}</p>
            <br>
            <p>Login to admin dashboard to approve this request and send token.</p>
            <p>Admin Dashboard: <a href="${req.protocol}://${req.get('host')}/admin.html">Click Here</a></p>
            <p><strong>REMINDER:</strong> Send the token to user's email once approved.</p>
        `;
        
        await tokenManager.sendEmail('traclelitemain@gmail.com', '📋 New Token Request - Tracle-Lite', adminEmailHtml);
        
        res.json({
            success: true,
            message: 'Token request submitted. Admin will review and send token to your email.',
            adminEmail: 'traclelitemain@gmail.com'
        });
        
    } catch (error) {
        console.error('Error requesting token:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to request token' 
        });
    }
});

// Add route to reload commands (ADMIN ONLY)
app.post('/api/admin/reload-commands', adminManager.verifyAdminToken.bind(adminManager), (req, res) => {
    try {
        console.log('🔄 Reloading commands...');
        commandHandler.loadCommands();
        console.log(`✅ Commands reloaded. Total: ${commandHandler.commands.size}`);
        
        res.json({
            success: true,
            message: `Commands reloaded. Total: ${commandHandler.commands.size}`,
            commandCount: commandHandler.commands.size
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reload commands',
            error: error.message
        });
    }
});

// =============== TEST BACKUP ENDPOINT ===============
app.post('/api/test-backup', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Session ID is required' 
            });
        }
        
        console.log(`🧪 Testing backup for session: ${sessionId}`);
        
        // Check if session exists locally
        const sessionPath = path.join(__dirname, 'sessions', sessionId);
        if (!fs.existsSync(sessionPath)) {
            return res.json({ 
                success: false, 
                message: 'Session not found locally' 
            });
        }
        
        // Check Supabase connection
        const authorized = await backupManager.ensureAuthorization();
        if (!authorized) {
            return res.json({ 
                success: false, 
                message: 'Supabase not authorized' 
            });
        }
        
        // Perform backup
        const backupResult = await backupManager.backupSessionToDrive(sessionId);
        
        // Check if session exists on Supabase
        const checkResult = await backupManager.checkSessionOnDrive(sessionId);
        
        res.json({
            success: backupResult.success,
            message: backupResult.success ? 'Backup successful' : 'Backup failed',
            backupResult: backupResult,
            existsOnSupabase: checkResult.sessionExists,
            fileCount: checkResult.fileCount,
            sessionId: sessionId
        });
        
    } catch (error) {
        console.error('Test backup error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// =============== PUBLIC API ENDPOINTS FOR FRONTEND ===============

// Get server health
app.get('/api/health', (req, res) => {
    const connectedSessions = Array.from(activeConnections.values())
        .filter(data => data.isConnected).length;
    
    res.json({
        status: 'healthy',
        service: 'Tracle-Lite V2 Universal Bot Processor',
        version: '2.0.0',
        botName: BOT_NAME,
        ownerName: OWNER_NAME,
        activeSessions: activeConnections.size,
        connectedSessions: connectedSessions,
        frontend: req.headers.origin || 'unknown',
        backend: IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com` : `http://localhost:${BACKEND_PORT}`,
        timestamp: new Date().toISOString(),
        processor: 'universal',
        supports: ['Heroku', 'Render', 'Railway', 'Anywhere']
    });
});

// User registration (FREE version)
app.post('/api/register', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        // Simple email validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Always accept registration for free version
        res.json({
            success: true,
            message: 'Registration successful! You can now use Tracle-Lite Pro for FREE.',
            email: email,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Email validation (always valid for free version)
app.post('/api/validate-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                valid: false, 
                message: 'Email is required' 
            });
        }

        // Always valid for free version
        res.json({
            valid: true,
            message: 'Email is valid',
            email: email
        });
        
    } catch (error) {
        console.error('Email validation error:', error);
        res.status(500).json({ 
            valid: true,
            message: 'Email validation passed' 
        });
    }
});

// Get pairing code
app.post('/api/get-pairing-code', async (req, res) => {
    try {
        const { email, userNumber } = req.body;
        
        if (!email || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and WhatsApp number are required' 
            });
        }

        const cleanNumber = userNumber.replace(/\D/g, '');
        
        // Validate number
        if (!/^\d+$/.test(cleanNumber) || cleanNumber.length < 10 || cleanNumber.length > 15) {
            return res.status(400).json({
                success: false,
                message: 'Invalid WhatsApp number format'
            });
        }

        // For now, return success - actual pairing happens via socket.io
        res.json({
            success: true,
            message: 'Pairing request received',
            userNumber: cleanNumber,
            email: email,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Pairing code error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate pairing code' 
        });
    }
});

// Get user sessions
app.post('/api/user/sessions', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        const sessionsPath = path.join(__dirname, 'sessions');
        const userSessions = [];
        
        if (fs.existsSync(sessionsPath)) {
            const folders = fs.readdirSync(sessionsPath);
            
            for (const userNumber of folders) {
                const userInfoPath = path.join(sessionsPath, userNumber, 'user_info.json');
                if (fs.existsSync(userInfoPath)) {
                    try {
                        const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                        
                        if (userInfo.email === email) {
                            const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
                            const isConnected = activeConnections.has(userNumber) && 
                                               activeConnections.get(userNumber).isConnected;
                            
                            userSessions.push({
                                userNumber: userNumber,
                                isConnected: isConnected,
                                registered: fs.existsSync(credsPath),
                                lastActivity: userInfo.lastActivity || null,
                                createdAt: userInfo.createdAt || null
                            });
                        }
                    } catch (error) {
                        console.error(`Error reading session ${userNumber}:`, error);
                    }
                }
            }
        }
        
        res.json({ 
            success: true,
            sessions: userSessions,
            count: userSessions.length
        });
        
    } catch (error) {
        console.error('Error getting user sessions:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get user sessions' 
        });
    }
});

// Delete user session
app.delete('/api/user/session', async (req, res) => {
    try {
        const { email, userNumber } = req.body;
        
        if (!email || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and session ID are required' 
            });
        }

        console.log(`🗑️ Deleting session ${userNumber} for ${email}`);
        
        // Verify ownership
        const userInfoPath = path.join(__dirname, 'sessions', userNumber, 'user_info.json');
        if (!fs.existsSync(userInfoPath)) {
            return res.status(404).json({ 
                success: false, 
                message: 'Session not found' 
            });
        }
        
        const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
        if (userInfo.email !== email) {
            return res.status(403).json({ 
                success: false, 
                message: 'Permission denied' 
            });
        }
        
        // Stop alive system
        stopAliveMessageSystem(userNumber);
        stopSessionRefreshSystem(userNumber);
        
        // Cleanup connection
        await cleanupSession(userNumber);
        
        // Delete session folder
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        if (fs.existsSync(sessionPath)) {
            await fs.remove(sessionPath);
        }
        
        res.json({ 
            success: true, 
            message: 'Session deleted successfully',
            userNumber: userNumber
        });
        
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete session' 
        });
    }
});

// =============== START BOT PROCESSOR ===============

const startBotProcessor = async () => {
    try {
        console.log(`\n🤖 ${BOT_NAME} Universal Bot Processor running on port ${BACKEND_PORT}`);
        console.log(`👑 Owner: ${OWNER_NAME}`);
        console.log(`🏭 Environment: ${IS_HEROKU ? 'Heroku Production' : 'Local Development'}`);
        console.log(`🔗 URL: ${IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com` : `http://localhost:${BACKEND_PORT}`}`);
        
        // Make activeConnections available globally for commands.js
        global.activeConnections = activeConnections;
        
        // Load commands
        commandHandler.loadCommands();
        console.log(`📦 Commands loaded: ${commandHandler.commands.size}`);
        
        // Debug: List all commands
        console.log('\n📋 LOADED COMMANDS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━');
        
        const commandList = Array.from(commandHandler.commands.entries());
        if (commandList.length === 0) {
            console.log('❌ No commands loaded!');
            console.log('Check if:');
            console.log('1. commands/ folder exists');
            console.log('2. command files are valid JavaScript');
            console.log('3. command files export execute() function');
        } else {
            commandList.forEach(([name, command], index) => {
                console.log(`${index + 1}. ${name} - ${command.description || 'No description'}`);
                if (command.ownerOnly) {
                    console.log(`   └── Owner only command`);
                }
            });
            console.log(`━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Total: ${commandList.length} commands`);
        }
        
        console.log(`🔗 Bot Processor URL: ${IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com` : `http://localhost:${BACKEND_PORT}`}`);
        console.log(`💾 Session persistence: ENABLED`);
        console.log(`🔒 Default Bot Mode: ${DEFAULT_USER_SETTINGS.botMode}`);
        console.log(`📱 Session restoration: ENABLED`);
        console.log(`📢 AUTO SUBSCRIPTION: ENABLED (Channels & Group)`);
        console.log(`🔗 Auto-join group: ${GROUP_INVITE_LINK}`);
        console.log(`🗑️ ANTI-DELETE: ENABLED`);
        console.log(`👨‍💼 ADMIN SYSTEM: ENABLED`);
        console.log(`☁️ CLOUD BACKUP: ENABLED - Sessions backed up to Supabase`);
        console.log(`🔄 SESSION REFRESH: ENABLED - Every 23 hours`);
        console.log(`🎉 TOKEN-FREE SYSTEM: ENABLED`);
        console.log(`🌍 UNIVERSAL DEPLOYMENT: Works on Heroku, Render, Railway, etc.`);
        
        // Verify index.html exists
        const indexPath = path.join(__dirname, 'public', 'index.html');
        if (fs.existsSync(indexPath)) {
            console.log(`✅ index.html found at: ${indexPath}`);
        } else {
            console.error(`❌ CRITICAL: index.html not found at: ${indexPath}`);
            console.log('📁 Public folder contents:', fs.existsSync(path.join(__dirname, 'public')) ? fs.readdirSync(path.join(__dirname, 'public')) : 'Folder does not exist');
        }
        
        // Restore existing sessions
        await restoreExistingSessions();
        
        // Initial active users count update
        updateActiveUsersCount();
        
        // Start connection monitor
        startConnectionMonitor();
        startConnectionHealthCheck();
        
        console.log(`✅ Universal bot processor initialized. Works anywhere!`);
        
    } catch (err) {
        console.error('❌ BOT PROCESSOR FAILED TO START:', err);
    }
};

startBotProcessor();

// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n🔻 Shutting down Universal bot processor gracefully...');
    console.log('💾 Saving last processed timestamps for all sessions');
    
    for (const [sessionId, timer] of aliveCheckTimers.entries()) {
        clearInterval(timer);
        console.log(`🛑 Stopped alive message system for ${sessionId}`);
    }
    
    for (const [sessionId, timer] of sessionRefreshTimers.entries()) {
        clearInterval(timer);
        console.log(`🛑 Stopped session refresh system for ${sessionId}`);
    }
    
    for (const [userNumber, connectionData] of activeConnections.entries()) {
        if (connectionData.lastTimestamp) {
            saveLastProcessedTimestamp(userNumber, connectionData.lastTimestamp);
            console.log(`💾 Saved timestamp for ${userNumber}: ${new Date(connectionData.lastTimestamp).toLocaleString()}`);
        }
    }

    for (const [userNumber, sock] of sessions.entries()) {
        console.log(`🔌 Closing connection: ${userNumber}`);
        try {
            sock.end();
        } catch (error) {
            console.log('Error closing socket:', error);
        }
    }

    console.log('✅ Bot processor shutdown complete');
    console.log('📁 Sessions will be restored on next startup');
    process.exit(0);
});

// Cleanup intervals
setInterval(() => {
    const now = Date.now();
    
    for (const [key, value] of messageStore.entries()) {
        if (now - value.timestamp > 3600000) {
            messageStore.delete(key);
        }
    }
    
    if (ownerCache.size > 100) {
        const oldKeys = Array.from(ownerCache.keys()).slice(0, 50);
        oldKeys.forEach(k => ownerCache.delete(k));
    }
}, 60000);

console.log('🔄 Memory cleanup interval started for anti-delete and owner cache');

// =============== MODULE EXPORTS ===============
module.exports = {
    app,
    server,
    io,
    PREFIX,
    isBotOwner,
    groupTimers,
    CHANNEL_JIDS,
    TARGET_GROUP_JID,
    GROUP_INVITE_LINK,
    BOT_NAME,
    OWNER_NAME,
    MENU_IMAGE_URL,
    warnedUsers,
    REPO_LINK,
    DEV,
    activeConnections,
    updateActiveUsersCount,
    getUserSettings,
    updateUserSettings,
    generateMenu: commandHandler.generateMenu,
    generateSupportMessage: commandHandler.generateSupportMessage,
    getQuotedMessage: commandHandler.getQuotedMessage,
    broadcastSubscribeToChannels,
    broadcastJoinGroup,
    userPrefixes,
    commands: commandHandler.commands,
    handleMessage,
    sendMessageWithContext,
    BACKEND_PORT,
    FRONTEND_PORT,
    IS_HEROKU,
    IS_LOCAL,
    HEROKU_APP_NAME
};
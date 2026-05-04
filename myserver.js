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

let HEROKU_APP_NAME = 'your-app';
if (IS_HEROKU) {
    HEROKU_APP_NAME = process.env.HEROKU_APP_NAME || 
                     process.env.APP_NAME || 
                     (process.env.HOSTNAME ? process.env.HOSTNAME.split('.')[0] : 'your-app') ||
                     'your-app';
}

const BACKEND_PORT = process.env.PORT || 3000;
const FRONTEND_PORT = BACKEND_PORT;

console.log(`🌍 Environment: ${IS_HEROKU ? 'Heroku Production' : 'Local Development'}`);
console.log(`🚀 Port: ${BACKEND_PORT}`);
if (IS_HEROKU) console.log(`🏷️  Heroku App: ${HEROKU_APP_NAME}`);

// =============== CORS CONFIGURATION ===============
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('herokuapp.com')) {
            callback(null, true);
        } else if (IS_LOCAL) {
            callback(null, true);
        } else {
            console.log('🌐 CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
}));

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============== SERVE STATIC FILES ===============
console.log('📁 Setting up static file serving...');
const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(publicPath)) {
    console.log(`✅ Public folder found at: ${publicPath}`);
    app.use(express.static(publicPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        setHeaders: (res, path) => {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }));
    
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
            return next();
        }
        const filePath = path.join(publicPath, req.path);
        if (fs.existsSync(filePath) && !req.path.endsWith('/')) {
            return next();
        }
        res.sendFile(path.join(publicPath, 'index.html'));
    });
    console.log('✅ Static file serving configured');
} else {
    console.error('❌ ERROR: Public folder not found at:', publicPath);
    fs.ensureDirSync(publicPath);
    fs.writeFileSync(path.join(publicPath, 'index.html'), '<html><body><h1>Tracle-Lite</h1><p>Place your frontend files here</p></body></html>');
}

const server = http.createServer(app);

// =============== SOCKET.IO CONFIGURATION ===============
const io = socketIO(server, {
    cors: { origin: "*", credentials: true, methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    cookie: false,
    maxHttpBufferSize: 1e8
});

io.engine.on("connection_error", (err) => {
    console.log('🔌 Socket.IO connection error:', {
        code: err.code,
        message: err.message,
        req: err.req?.headers?.origin || 'unknown'
    });
});

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
    `);
});

// =============== BOT MODULES ===============
console.log('🤖 Loading Tracle-Lite bot processor...');

// =============== UPDATE BAILEYS TO LATEST ===============
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
    Browsers,
    delay,
    isJidGroup
} = baileys;

console.log('📦 Using @whiskeysockets/baileys (latest via fetchLatestBaileysVersion)');
const warnedUsers = new Map();
const pino = require('pino');

const commandHandler = require('./commands');
const { Antilink, getAntilink } = require('./lib/index');
const antibadwordModule = require('./lib/antibadword');
const welcomeModule = require('./commands/welcome');
const goodbyeModule = require('./commands/goodbye');

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
    return conn.sendMessage(jid, { text, contextInfo }, options.quoted ? { quoted: options.quoted } : {});
};

// =============== API ENDPOINTS ===============
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

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Tracle-Lite V2 Universal',
        environment: IS_HEROKU ? 'Production' : 'Development',
        frontendUrl: req.headers.origin || 'unknown',
        backendUrl: IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com` : `http://localhost:${BACKEND_PORT}`,
        socketIO: true,
        timestamp: new Date().toISOString(),
        processor: 'universal'
    });
});

app.get('/api/test-connection', (req, res) => {
    res.json({
        success: true,
        message: 'Universal bot processor is running!',
        timestamp: new Date().toISOString(),
        environment: IS_HEROKU ? 'Production' : 'Development'
    });
});

app.get('/api/wake', (req, res) => {
    res.json({ awake: true, timestamp: new Date().toISOString(), message: 'Instance is awake and running' });
});

app.get('/api/ping', (req, res) => {
    res.json({ pong: Date.now(), message: 'Server is alive', uptime: process.uptime() });
});

// =============== OPTIONAL MODULES ===============
let backupManager, tokenManager, adminManager;

try {
    backupManager = require('./backup');
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        backupManager = {
            isConfigured: () => false,
            backupSessionToDrive: async () => ({ success: false, error: 'Supabase not configured' }),
            backupNewUserSession: async () => ({ success: false, error: 'Supabase not configured' }),
            restoreAllData: async () => ({ success: false, message: 'Supabase not configured' }),
            checkSessionOnDrive: async () => ({ sessionExists: false, fileCount: 0 }),
            ensureAuthorization: async () => false
        };
    }
} catch (err) {
    backupManager = {
        isConfigured: () => false,
        backupSessionToDrive: async () => ({ success: false, error: 'Module not available' }),
        backupNewUserSession: async () => ({ success: false, error: 'Module not available' }),
        restoreAllData: async () => ({ success: false, message: 'Module not available' }),
        checkSessionOnDrive: async () => ({ sessionExists: false, fileCount: 0 }),
        ensureAuthorization: async () => false
    };
}

try {
    tokenManager = require('./token');
} catch (err) {
    tokenManager = {
        getAllUsers: async () => ({}),
        saveUsers: async () => {},
        generateTokenForEmail: async () => ({ success: false, message: 'Tokens disabled' }),
        validateToken: async () => ({ valid: true, message: 'Free mode - always valid' }),
        validateTokenWithEmail: async () => ({ valid: true, message: 'Free mode - always valid' }),
        requestToken: async () => ({ success: false }),
        getStats: async () => ({ totalUsers: 0, totalTokens: 0 }),
        sendEmail: async () => {}
    };
}

try {
    adminManager = require('./admin');
} catch (err) {
    adminManager = {
        setupRoutes: (app) => { console.log('⚠️ Admin routes disabled'); },
        verifyAdminToken: () => (req, res, next) => { next(); }
    };
}

// =============== GLOBAL VARIABLES ===============
const messageStore = new Map();
const viewOnceBuffer = new Map();
const userPrefixes = new Map();
const activeConnections = new Map();
app.locals.activeConnections = activeConnections;
const pairingTimeouts = new Map();
const sessions = new Map();
const groupTimers = new Map();
const ownerCache = new Map();
const CACHE_TTL = 60000;
const sessionRefreshTimers = new Map();
const SESSION_REFRESH_INTERVAL = 23 * 60 * 60 * 1000;
const aliveCheckTimers = new Map();
const ALIVE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const CONNECTION_CHECK_INTERVAL = 5 * 60 * 1000;

const commands = commandHandler.commands;
// =============== BOT CONFIG FROM ENV ===============
const BOT_NAME = process.env.BOT_NAME || "TRACLE - LITE";
const OWNER_NAME = process.env.OWNER_NAME || "Brenaldmedia";
const DEV = process.env.DEV || "Brenaldmedia";
const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || "https://files.catbox.moe/zlu6dx.jpg";
const REPO_LINK = process.env.REPO_LINK || "https://github.com/Brenaldmedia/Tracle";
const PREFIX = process.env.PREFIX || ".";
const STICKER_NAME = process.env.STICKER_NAME || "Tracle - Lite";
const STICKER_AUTHOR = process.env.STICKER_AUTHOR || "Brenaldmedia";

// Owner Numbers (supports multiple from env)
const OWNER_NUMBERS_GLOBAL = process.env.OWNER_NUMBER || process.env.OWNER_NUMBERS || "";
const OWNER_NUMBERS = OWNER_NUMBERS_GLOBAL 
    ? OWNER_NUMBERS_GLOBAL.split(',').map(num => num.replace(/\D/g, '').trim()).filter(Boolean) 
    : [];
const CHANNEL_JIDS = process.env.CHANNEL_JIDS ? [...new Set(process.env.CHANNEL_JIDS.split(','))] : [];
const GROUP_INVITE_LINK = "https://chat.whatsapp.com/HZnha8aKKQRDBOAtK5qUeC";
const TARGET_GROUP_JID = "120363420555765995@g.us";

const DEFAULT_USER_SETTINGS = {
    botMode: process.env.DEFAULT_BOT_MODE || "public",
    autoViewStatus: process.env.DEFAULT_AUTO_VIEW_STATUS || "true",
    autoLikeStatus: process.env.DEFAULT_AUTO_LIKE_STATUS || "false",
    antiDelete: process.env.ENABLE_ANTIDELETE || "true",
    antiStatusDelete: "true",
    antiDeleteMode: "dm",
    antiEdit: "true",
    antiEditMode: "dm",
    autoTyping: "false",
    autoRecording: "false",
    welcomeEnabled: process.env.GOODBYE_ENABLED === "true" ? "true" : "false", // you can adjust
    goodbyeEnabled: process.env.GOODBYE_ENABLED || "true",
    bankName: process.env.DEFAULT_BANK_NAME || "ZENITH BANK",
    accountNumber: process.env.DEFAULT_ACCOUNT_NUMBER || "2126335411",
    accountName: process.env.DEFAULT_ACCOUNT_NAME || "EMMANUEL ISIBOR",
    botImage: MENU_IMAGE_URL,
    ownerName: OWNER_NAME,
    botName: BOT_NAME,
    groupOpenTime: null,
    groupCloseTime: null,
    autoResponses: {},
    reminders: []
};
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
});

transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready →', process.env.EMAIL_USER);
    }
});
// =============== SESSION REFRESH SYSTEM ===============
function startSessionRefreshSystem(sessionId, conn) {
    if (sessionRefreshTimers.has(sessionId)) {
        clearInterval(sessionRefreshTimers.get(sessionId));
        sessionRefreshTimers.delete(sessionId);
    }
    const timer = setInterval(async () => {
        try {
            const connectionData = activeConnections.get(sessionId);
            if (!connectionData || !connectionData.isConnected || !conn || !conn.user) return;
            const botJid = conn.user.id;
            let botNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
            botNumber = botNumber.replace(/\D/g, '');
            const userJid = `${botNumber}@s.whatsapp.net`;
            const userSettings = getUserSettings(sessionId);
            await sendMessageWithContext(conn, userJid, '🔄 Session refresh - Bot remains active', {
                externalAdReply: {
                    title: "Session Refresh",
                    body: "Keeping your bot active",
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            }).catch(() => {});
            connectionData.lastActivity = Date.now();
        } catch (error) {
            console.error(`❌ Error refreshing session ${sessionId}:`, error.message);
        }
    }, SESSION_REFRESH_INTERVAL);
    sessionRefreshTimers.set(sessionId, timer);
}

function stopSessionRefreshSystem(sessionId) {
    if (sessionRefreshTimers.has(sessionId)) {
        clearInterval(sessionRefreshTimers.get(sessionId));
        sessionRefreshTimers.delete(sessionId);
    }
}

// =============== ALIVE MESSAGE SYSTEM ===============
function startAliveMessageSystem(sessionId, conn, userSettings) {
    if (aliveCheckTimers.has(sessionId)) {
        clearInterval(aliveCheckTimers.get(sessionId));
        aliveCheckTimers.delete(sessionId);
    }
    const timer = setInterval(async () => {
        try {
            if (!conn || !conn.user || !conn.user.id) return;
            const connectionData = activeConnections.get(sessionId);
            if (!connectionData || !connectionData.isConnected) return;
            const botJid = conn.user.id;
            let botNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
            botNumber = botNumber.replace(/\D/g, '');
            const userJid = `${botNumber}@s.whatsapp.net`;
            const aliveMessage = `💀 *${userSettings.botName || BOT_NAME} - SYSTEM STATUS REPORT* 💀\n\nSurprise. I'm still alive.\nTrust me, I'm just as shocked as you are.\n\n🕒 Time: ${new Date().toLocaleString()}\n📱 Session ID: ${sessionId}\n⚙️ Status: Running\n📡 Connection: Running smoothly\n🧠 Bot Health: 100%\n\nNeed something? Type *${userPrefixes.get(sessionId) || PREFIX}menu*.\n\nAnyway… stay chaotic. 🌚`;
            await sendMessageWithContext(conn, userJid, aliveMessage, {
                externalAdReply: {
                    title: `${userSettings.botName || BOT_NAME} Status`,
                    body: "Still alive and running",
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                }
            });
        } catch (error) {
            if (error.message.includes('Connection closed') || error.message.includes('not connected')) {
                const connectionData = activeConnections.get(sessionId);
                if (connectionData) connectionData.isConnected = false;
            }
        }
    }, ALIVE_CHECK_INTERVAL);
    aliveCheckTimers.set(sessionId, timer);
}

function stopAliveMessageSystem(sessionId) {
    if (aliveCheckTimers.has(sessionId)) {
        clearInterval(aliveCheckTimers.get(sessionId));
        aliveCheckTimers.delete(sessionId);
    }
}

function startConnectionMonitor() {
    setInterval(() => {
        for (const [sessionId, connectionData] of activeConnections.entries()) {
            const { conn, isConnected } = connectionData;
            if (!conn || !conn.user || !conn.user.id) {
                connectionData.isConnected = false;
                continue;
            }
            try {
                connectionData.lastActivity = Date.now();
            } catch (error) {
                connectionData.isConnected = false;
            }
        }
    }, CONNECTION_CHECK_INTERVAL);
}

function getUserSettings(sessionId) {
    const userConnection = activeConnections.get(sessionId);
    if (userConnection && userConnection.settings) return userConnection.settings;
    const savedSettings = loadUserSettingsFromFile(sessionId);
    if (userConnection) userConnection.settings = savedSettings;
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
        if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
        fs.writeFileSync(path.join(settingsDir, "settings.json"), JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error("Error saving user settings:", error);
    }
}

function loadUserSettingsFromFile(sessionId) {
    try {
        const settingsPath = path.join(__dirname, "sessions", sessionId, "settings.json");
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
    } catch (error) {
        console.error("Error loading user settings:", error);
    }
    return { ...DEFAULT_USER_SETTINGS };
}

function getUserTrigger(sessionId) {
    try {
        const secretVVPath = path.join(__dirname, 'data', 'secretvv.json');
        if (fs.existsSync(secretVVPath)) {
            const settings = JSON.parse(fs.readFileSync(secretVVPath, 'utf8'));
            return settings[sessionId] || '🎩';
        }
    } catch (error) {}
    return '🎩';
}

global.getUserSettings = getUserSettings;
global.isBotOwner = isBotOwner;
global.updateUserSettings = updateUserSettings;

// =============== OWNER RECOGNITION ===============
function isBotOwner(conn, message, sessionId) {
    try {
        const sessionNumber = sessionId.replace(/\D/g, '');
        const senderJid = message.key?.participant || message.key?.remoteJid;
        let senderNumber = '';
        if (senderJid) {
            if (senderJid.includes('@lid')) senderNumber = senderJid.split('@')[0];
            else if (senderJid.includes('@s.whatsapp.net')) senderNumber = senderJid.split('@')[0];
            else if (senderJid.includes(':')) senderNumber = senderJid.split(':')[0];
            else senderNumber = senderJid;
            senderNumber = senderNumber.replace(/\D/g, '');
        }
        if (message.key && message.key.fromMe === true) return true;
        if (senderNumber && sessionNumber && senderNumber === sessionNumber) return true;
        for (const ownerNum of OWNER_NUMBERS) {
            if ((senderNumber && (senderNumber.includes(ownerNum) || ownerNum.includes(senderNumber))) ||
                (sessionNumber.includes(ownerNum) || ownerNum.includes(sessionNumber))) {
                return true;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

function shouldBotRespond(conn, message, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        const isOwner = isBotOwner(conn, message, sessionId);
        if (userSettings.botMode === "public") return true;
        else if (userSettings.botMode === "private") return isOwner;
        return false;
    } catch (error) {
        return true;
    }
}

function getMessageType(message) {
    if (message.message?.conversation) return 'TEXT';
    if (message.message?.extendedTextMessage) return 'TEXT';
    if (message.message?.imageMessage) return 'IMAGE';
    if (message.message?.videoMessage) return 'VIDEO';
    if (message.message?.audioMessage) {
        return message.message.audioMessage.ptt === true ? 'VOICE' : 'AUDIO';
    }
    if (message.message?.documentMessage) return 'DOCUMENT';
    if (message.message?.stickerMessage) return 'STICKER';
    if (message.message?.contactMessage) return 'CONTACT';
    if (message.message?.locationMessage) return 'LOCATION';
    if (message.message?.pollCreationMessage) return 'POLL';
    if (message.message?.reactionMessage) return 'REACTION';
    return 'UNKNOWN';
}

async function checkAntilink(conn, message, sessionId) {
    try {
        const jid = message.key.remoteJid;
        if (!isJidGroup(jid) || !message.message) return;
        const body = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        if (!body || typeof body !== 'string') return;
        const antilinkConfig = await getAntilink(jid);
        if (!antilinkConfig || !antilinkConfig.enabled) return;
        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        if (body.startsWith(userPrefix)) return;
        await Antilink(message, conn, sessionId);
    } catch (error) {
        console.error('Error in checkAntilink:', error);
    }
}

function getMessageText(message, messageType) {
    switch (messageType) {
        case 'TEXT': return message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        case 'IMAGE': return message.message?.imageMessage?.caption || '[Image]';
        case 'VIDEO': return message.message?.videoMessage?.caption || '[Video]';
        case 'AUDIO': return '[Audio]';
        case 'VOICE': return '[Voice Note]';
        case 'DOCUMENT': return message.message?.documentMessage?.fileName || '[Document]';
        case 'STICKER': return '[Sticker]';
        case 'CONTACT': return '[Contact]';
        case 'LOCATION': return '[Location]';
        case 'POLL': return '[Poll]';
        case 'REACTION': return '[Reaction]';
        default: return `[${messageType}]`;
    }
}

// =============== ANTI-DELETE FUNCTIONS ===============
async function handleAntiDelete(conn, update, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        const isStatusDelete = update.key?.remoteJid === 'status@broadcast';

        if (isStatusDelete) {
            if (userSettings.antiStatusDelete !== "true") return;
            const deletedKey = update.key;
            const statusKey = `status_${deletedKey.id}`;
            const deletedStatus = messageStore.get(statusKey);
            if (deletedStatus) {
                const { mediaData, text, messageType, timestamp, senderJid, senderName } = deletedStatus;
                let displayName = senderName || "Unknown";
                let mentionJid = senderJid;
                if (senderJid) {
                    try {
                        const contact = await conn.getContact(senderJid);
                        if (contact?.name) displayName = contact.name;
                    } catch (e) {}
                }
                const mediaTypeText = messageType === 'IMAGE' ? '🖼️ Image' : messageType === 'VIDEO' ? '🎬 Video' : messageType === 'TEXT' ? '📝 Text' : messageType === 'STICKER' ? '🎨 Sticker' : '📎 Media';
                const numberOnly = mentionJid ? mentionJid.split('@')[0] : '';
                const restoreMessage = `🚫 *ANTI-STATUS-DELETE DETECTED*\n\n👤 *From:* @${numberOnly}\n📝 *Type:* ${mediaTypeText}\n⏰ *Time:* ${new Date(timestamp).toLocaleString()}\n${text ? `💬 *Content:* ${text}\n` : ''}`;
                const botJid = conn.user.id;
                let botNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
                botNumber = botNumber.replace(/\D/g, '');
                const ownerJid = `${botNumber}@s.whatsapp.net`;
                const mentions = mentionJid ? [mentionJid] : [];
                if (mediaData?.image || mediaData?.video) {
                    if (mediaData.image) await conn.sendMessage(ownerJid, { image: mediaData.image, caption: restoreMessage, mentions });
                    else await conn.sendMessage(ownerJid, { video: mediaData.video, caption: restoreMessage, mentions });
                } else {
                    await conn.sendMessage(ownerJid, { text: restoreMessage, mentions });
                }
                messageStore.delete(statusKey);
            }
            return;
        }

        if (userSettings.antiDelete !== "true") return;
        if (update.update && update.update.message === null && update.key) {
            const deletedMessageKey = `${update.key.remoteJid}_${update.key.id}`;
            const deletedMessage = messageStore.get(deletedMessageKey);
            if (deletedMessage) {
                const { mediaData, text, groupName, messageType, timestamp, sender, senderName } = deletedMessage;
                const deleter = update.key.participant || update.key.remoteJid;
                let senderDisplay = senderName || "Unknown";
                let deleterDisplay = "Unknown";
                let senderMentionJid = sender;
                let deleterMentionJid = deleter;
                if (sender) {
                    try {
                        const contact = await conn.getContact(sender);
                        if (contact?.name) senderDisplay = contact.name;
                    } catch (e) {}
                }
                if (deleter) {
                    try {
                        const contact = await conn.getContact(deleter);
                        if (contact?.name) deleterDisplay = contact.name;
                    } catch (e) {}
                }
                const senderNumber = senderMentionJid ? senderMentionJid.split('@')[0] : '';
                const deleterNumber = deleterMentionJid ? deleterMentionJid.split('@')[0] : '';
                let restoreMessage = `🚫 *ANTI-DELETE DETECTED*\n\n`;
                if (groupName) restoreMessage += `👥 *Group:* ${groupName}\n`;
                restoreMessage += update.key.remoteJid.includes('@g.us') ? `📍 Group Chat\n` : `💬 Private Chat\n`;
                const typeIcon = messageType === 'TEXT' ? '📝' : messageType === 'IMAGE' ? '🖼️' : messageType === 'VIDEO' ? '🎬' : messageType === 'STICKER' ? '🎨' : '📎';
                restoreMessage += `📝 *Type:* ${typeIcon} ${messageType}\n`;
                restoreMessage += `👤 *Sender:* @${senderNumber}\n`;
                restoreMessage += `🗑️ *Deleted by:* @${deleterNumber}\n`;
                restoreMessage += `⏰ *Time:* ${new Date(timestamp).toLocaleString()}\n\n`;
                if (text) restoreMessage += `💬 *Content:* ${text}\n`;
                const mentions = [];
                if (senderMentionJid) mentions.push(senderMentionJid);
                if (deleterMentionJid) mentions.push(deleterMentionJid);
                const botJid = conn.user.id;
                let botNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
                botNumber = botNumber.replace(/\D/g, '');
                const ownerJid = `${botNumber}@s.whatsapp.net`;
                if (userSettings.antiDeleteMode === "dm") {
                    if (mediaData?.image || mediaData?.video || mediaData?.sticker) {
                        if (mediaData.image) await conn.sendMessage(ownerJid, { image: mediaData.image, caption: restoreMessage, mentions });
                        else if (mediaData.video) await conn.sendMessage(ownerJid, { video: mediaData.video, caption: restoreMessage, mentions });
                        else if (mediaData.sticker) {
                            await conn.sendMessage(ownerJid, { sticker: mediaData.sticker });
                            await conn.sendMessage(ownerJid, { text: restoreMessage, mentions });
                        }
                    } else {
                        await conn.sendMessage(ownerJid, { text: restoreMessage, mentions });
                    }
                } else {
                    if (mediaData?.image || mediaData?.video || mediaData?.sticker) {
                        if (mediaData.image) await conn.sendMessage(update.key.remoteJid, { image: mediaData.image, caption: restoreMessage, mentions });
                        else if (mediaData.video) await conn.sendMessage(update.key.remoteJid, { video: mediaData.video, caption: restoreMessage, mentions });
                        else if (mediaData.sticker) {
                            await conn.sendMessage(update.key.remoteJid, { sticker: mediaData.sticker });
                            await conn.sendMessage(update.key.remoteJid, { text: restoreMessage, mentions });
                        }
                    } else {
                        await conn.sendMessage(update.key.remoteJid, { text: restoreMessage, mentions });
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
            const isStatus = message.key.remoteJid === 'status@broadcast';
            const storeKey = isStatus ? `status_${message.key.id}` : messageKey;
            let actualMessage = message.message;
            if (actualMessage.viewOnceMessage) actualMessage = actualMessage.viewOnceMessage.message || actualMessage.viewOnceMessage;
            else if (actualMessage.viewOnceMessageV2) actualMessage = actualMessage.viewOnceMessageV2.message || actualMessage.viewOnceMessageV2;
            else if (actualMessage.viewOnceMessageV2Extension) actualMessage = actualMessage.viewOnceMessageV2Extension.message || actualMessage.viewOnceMessageV2Extension;
            const messageType = getMessageType({ message: actualMessage });
            const text = getMessageText({ message: actualMessage }, messageType);
            const sender = message.key.participant || message.key.remoteJid;
            const senderName = message.pushName || sender?.split('@')[0] || 'Unknown';
            let groupName = null;
            if (message.key.remoteJid.endsWith('@g.us') && !isStatus) {
                try {
                    const groupMetadata = await conn.groupMetadata(message.key.remoteJid);
                    groupName = groupMetadata.subject || 'Unknown Group';
                } catch (error) {}
            }
            let mediaData = null;
            if ((messageType === 'IMAGE' || actualMessage.imageMessage) && (actualMessage.imageMessage || actualMessage.videoMessage?.thumbnailDirectPath)) {
                const imgMsg = actualMessage.imageMessage || actualMessage.videoMessage;
                if (imgMsg) {
                    try {
                        const stream = await downloadContentFromMessage(imgMsg, 'image');
                        const buffer = await streamToBuffer(stream);
                        mediaData = { image: buffer };
                    } catch (error) {}
                }
            } else if ((messageType === 'VIDEO' || actualMessage.videoMessage) && actualMessage.videoMessage) {
                try {
                    const stream = await downloadContentFromMessage(actualMessage.videoMessage, 'video');
                    const buffer = await streamToBuffer(stream);
                    mediaData = { video: buffer };
                } catch (error) {}
            } else if (messageType === 'STICKER' && actualMessage.stickerMessage) {
                try {
                    const stream = await downloadContentFromMessage(actualMessage.stickerMessage, 'sticker');
                    const buffer = await streamToBuffer(stream);
                    mediaData = { sticker: buffer };
                } catch (error) {}
            }
            messageStore.set(storeKey, {
                message: { message: actualMessage },
                originalMessage: message,
                sender: sender,
                senderName: senderName,
                senderJid: sender,
                text: text,
                groupName: groupName,
                messageType: messageType,
                mediaData: mediaData,
                timestamp: Date.now(),
                isStatus: isStatus
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
// ===============  ANTI-EDIT HANDLER  (2026) ===============


async function handleAntiEdit(conn, update, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        if (userSettings.antiEdit !== "true") return;

        const key = update.key;
        if (!key) return;

        const msgId = `${key.remoteJid}_${key.id}`;

        // === IMPROVED TEXT EXTRACTION FOR EDITS ===
        const updateMsg = update.update?.message || {};
        let newText = "[No text found]";

        // Most common edit structures
        if (updateMsg.conversation) newText = updateMsg.conversation;
        else if (updateMsg.extendedTextMessage?.text) newText = updateMsg.extendedTextMessage.text;
        else if (updateMsg.editedMessage?.conversation) newText = updateMsg.editedMessage.conversation;
        else if (updateMsg.editedMessage?.extendedTextMessage?.text) newText = updateMsg.editedMessage.extendedTextMessage.text;
        else if (updateMsg.editedMessage?.message?.conversation) newText = updateMsg.editedMessage.message.conversation;
        else if (updateMsg.editedMessage?.message?.extendedTextMessage?.text) newText = updateMsg.editedMessage.message.extendedTextMessage.text;

        // Fallback for media captions
        if (newText === "[No text found]") {
            if (updateMsg.imageMessage?.caption) newText = updateMsg.imageMessage.caption;
            if (updateMsg.videoMessage?.caption) newText = updateMsg.videoMessage.caption;
        }

        let stored = messageStore.get(msgId);

        // Store original if first time
        if (!stored) {
            messageStore.set(msgId, {
                text: newText,
                timestamp: Date.now(),
                remoteJid: key.remoteJid,
                participant: key.participant
            });
            return;
        }

        // If no real change, ignore
        if (newText === stored.text || newText === "[No text found]") return;

        console.log(`✅ EDIT DETECTED → Old: "${stored.text}" | New: "${newText}"`);

        // Get real group name
        let chatName = "Private Chat";
        if (key.remoteJid.endsWith('@g.us')) {
            try {
                const groupMeta = await conn.groupMetadata(key.remoteJid);
                chatName = groupMeta.subject || "Unknown Group";
            } catch (e) {}
        }

        // Build notification
        const senderJid = key.participant || key.remoteJid;
        const numberOnly = senderJid.split('@')[0];

        const notifyText = `✍️ *ANTI-EDIT DETECTED*\n\n` +
                          `👤 *User:* @${numberOnly}\n` +
                          `👥 *Group:* ${chatName}\n` +
                          `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
                          `📝 *Original:* ${stored.text}\n\n` +
                          `✏️ *Edited:* ${newText}`;

        const mentions = [senderJid];

        const botJid = conn.user.id;
        let botNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
        botNumber = botNumber.replace(/\D/g, '');
        const ownerJid = `${botNumber}@s.whatsapp.net`;

        if (userSettings.antiEditMode === "group" && key.remoteJid.endsWith('@g.us')) {
            await conn.sendMessage(key.remoteJid, { text: notifyText, mentions }).catch(() => {});
        } else {
            await conn.sendMessage(ownerJid, { text: notifyText, mentions }).catch(() => {});
        }

        // Update stored text
        stored.text = newText;
        messageStore.set(msgId, stored);

    } catch (error) {
        console.error("❌ Anti-Edit Error:", error.message);
    }
}
// =============== VIEW-ONCE CAPTURE ===============
async function captureViewOnceDirect(conn, message, sessionId) {
    try {
        if (!message.message) return;
        let viewOnceNode = null;
        if (message.message.viewOnceMessage) viewOnceNode = message.message.viewOnceMessage;
        else if (message.message.viewOnceMessageV2) viewOnceNode = message.message.viewOnceMessageV2;
        else if (message.message.viewOnceMessageV2Extension) viewOnceNode = message.message.viewOnceMessageV2Extension;
        else return;
        const innerPayload = viewOnceNode.message || viewOnceNode;
        let innerNode = null;
        let mediaType = null;
        if (innerPayload.imageMessage) { innerNode = innerPayload.imageMessage; mediaType = 'image'; }
        else if (innerPayload.videoMessage) { innerNode = innerPayload.videoMessage; mediaType = 'video'; }
        else return;
        let buffer = null;
        try {
            const stream = await downloadContentFromMessage(innerNode, mediaType);
            let chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            buffer = Buffer.concat(chunks);
        } catch (downloadErr) { return; }
        if (!buffer || buffer.length === 0) return;
        let senderJid = message.key.participant || message.key.remoteJid;
        let senderName = senderJid ? senderJid.split('@')[0] : 'Unknown';
        if (message.pushName) senderName = message.pushName;
        let caption = innerNode.caption || "";
        let chatJid = message.key.remoteJid;
        let locationName = chatJid.includes('@g.us') ? 'Group Chat' : 'Private Chat';
        if (chatJid.includes('@g.us')) {
            try {
                const groupMeta = await conn.groupMetadata(chatJid);
                locationName = groupMeta.subject || 'Unknown Group';
            } catch (e) {}
        }
        const storeKey = `${chatJid}_${message.key.id}`;
        viewOnceBuffer.set(storeKey, {
            buffer: buffer, mediaType: mediaType, senderName: senderName,
            senderJid: senderJid, caption: caption, chatJid: chatJid,
            timestamp: Date.now(), msgId: message.key.id
        });
        const botJid = conn.user?.id;
        let botNumber = '';
        if (botJid) {
            botNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
            botNumber = botNumber.replace(/\D/g, '');
        }
        const ownerJid = `${botNumber}@s.whatsapp.net`;
        const dmCaption = `🎩 *VIEW-ONCE CAPTURED*\n\n👤 *From:* ${senderName}\n📍 *Location:* ${locationName}\n🕐 *Time:* ${new Date().toLocaleString()}${caption ? `\n📝 *Caption:* ${caption}` : ''}\n🔑 *Msg ID:* ${message.key.id}\n\n⚡ React with your secret emoji to view again!`;
        if (mediaType === 'image') await conn.sendMessage(ownerJid, { image: buffer, caption: dmCaption });
        else if (mediaType === 'video') await conn.sendMessage(ownerJid, { video: buffer, caption: dmCaption });
        setTimeout(() => {
            if (viewOnceBuffer.has(storeKey)) viewOnceBuffer.delete(storeKey);
        }, 10 * 60 * 1000);
    } catch (error) {
        console.error('❌ Error in captureViewOnceDirect:', error);
    }
}

// =============== MESSAGE HANDLING ===============
async function handleMessage(conn, message, sessionId) {
    try {
        const connectionData = activeConnections.get(sessionId);
        if (!connectionData || !connectionData.isConnected) return;
        connectionData.lastActivity = Date.now();
        const messageType = getMessageType(message);
        let body = getMessageText(message, messageType);
        if (!message.message) return;
        await checkAntilink(conn, message, sessionId);
        if (isJidGroup(message.key.remoteJid)) {
            try {
                const userPrefix = userPrefixes.get(sessionId) || PREFIX;
                if (!body.startsWith(userPrefix)) {
                    const senderId = message.key.participant || message.key.remoteJid;
                    const antiBadwordConfig = await antibadwordModule.getAntiBadword(message.key.remoteJid);
                    if (antiBadwordConfig?.enabled) {
                        await antibadwordModule.handleBadwordDetection(conn, message.key.remoteJid, message, body, senderId);
                    }
                }
            } catch (error) {}
        }
        await storeMessageForAntiDelete(conn, message);

        // SECRET VV TRIGGER
        if (messageType === 'TEXT' && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const replyText = body.trim();
            const userTrigger = getUserTrigger(sessionId);
            if (replyText === userTrigger) {
                await conn.sendMessage(message.key.remoteJid, { react: { text: "⏳", key: message.key } }).catch(() => {});
                try {
                    const contextInfo = message.message.extendedTextMessage.contextInfo;
                    let quotedMsg = contextInfo.quotedMessage || {};
                    let innerPayload = null;
                    const possibleViewOnce = [
                        quotedMsg.viewOnceMessage, quotedMsg.viewOnceMessageV2,
                        quotedMsg.viewOnceMessageV2Extension, quotedMsg.message?.viewOnceMessage,
                        quotedMsg.message?.viewOnceMessageV2
                    ];
                    for (const p of possibleViewOnce) {
                        if (p) { innerPayload = p.message || p; break; }
                    }
                    if (!innerPayload) {
                        if (quotedMsg.imageMessage || quotedMsg.videoMessage) innerPayload = quotedMsg;
                        else if (quotedMsg.message?.imageMessage || quotedMsg.message?.videoMessage) innerPayload = quotedMsg.message;
                    }
                    if (!innerPayload) {
                        await conn.sendMessage(message.key.remoteJid, { react: { text: "❌", key: message.key } }).catch(() => {});
                        return;
                    }
                    const innerNode = innerPayload.imageMessage || innerPayload.videoMessage;
                    const mediaType = innerPayload.imageMessage ? 'image' : (innerPayload.videoMessage ? 'video' : null);
                    if (!innerNode || !mediaType) {
                        await conn.sendMessage(message.key.remoteJid, { react: { text: "❌", key: message.key } }).catch(() => {});
                        return;
                    }
                    const stream = await downloadContentFromMessage(innerNode, mediaType);
                    let chunks = [];
                    for await (const chunk of stream) chunks.push(chunk);
                    const buffer = Buffer.concat(chunks);
                    if (buffer.length === 0) throw new Error("Empty buffer");
                    let senderName = contextInfo.participant ? contextInfo.participant.split('@')[0] : "Unknown";
                    let locationName = message.key.remoteJid.includes('@g.us') ? "Group" : "Private";
                    const botJid = conn.user?.id || "";
                    const botNumber = botJid ? (botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0]).replace(/\D/g, '') : "";
                    const ownerJid = `${botNumber}@s.whatsapp.net`;
                    const dmCaption = `🎩 *VIEW-ONCE UNLOCKED* 🔓\n\n👤 From: ${senderName}\n📍 Location: ${locationName}\n🕒 ${new Date().toLocaleString()}\n${innerNode.caption ? `📝 Caption: ${innerNode.caption}\n` : ''}\n🔑 Unlocked with: ${replyText}`;
                    if (mediaType === 'image') await conn.sendMessage(ownerJid, { image: buffer, caption: dmCaption });
                    else await conn.sendMessage(ownerJid, { video: buffer, caption: dmCaption });
                    await conn.sendMessage(message.key.remoteJid, { react: { text: "✅", key: message.key } }).catch(() => {});
                    setTimeout(() => { conn.sendMessage(message.key.remoteJid, { delete: message.key }).catch(() => {}); }, 800);
                    return;
                } catch (error) {
                    await conn.sendMessage(message.key.remoteJid, { react: { text: "❌", key: message.key } }).catch(() => {});
                    return;
                }
            }
        }

        // VIEW-ONCE AUTO-CAPTURE
        let isViewOnce = false;
        let viewOnceMsg = null;
        if (message.message?.viewOnceMessage || message.message?.viewOnceMessageV2 || message.message?.viewOnceMessageV2Extension) {
            isViewOnce = true;
            viewOnceMsg = message;
        }
        if (isViewOnce && viewOnceMsg) await captureViewOnceDirect(conn, viewOnceMsg, sessionId);

        // COMMAND CHECK
        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        if (!body.startsWith(userPrefix)) return;
        const args = body.slice(userPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const shouldRespond = shouldBotRespond(conn, message, sessionId);
        if (!shouldRespond) return;
             const userSettings = getUserSettings(sessionId);

      
        // AUTO-RESPONSE CHECK
        if (!body.startsWith(userPrefix)) {
            if (userSettings.autoResponses && Object.keys(userSettings.autoResponses).length > 0) {
                const lowerBody = body.toLowerCase().trim();
                for (const [trigger, response] of Object.entries(userSettings.autoResponses)) {
                    if (lowerBody === trigger.toLowerCase() || lowerBody.includes(trigger.toLowerCase())) {
                        await conn.sendMessage(message.key.remoteJid, { text: response, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363401559573199@newsletter", newsletterName: "BrenaldMedia", serverMessageId: -1 } } }, { quoted: message });
                        break;
                    }
                }
            }
        }

        // COMMAND EXECUTION
        if (commands.has(commandName)) {
            const command = commands.get(commandName);
            if (typeof command.execute !== 'function') {
                await sendMessageWithContext(conn, message.key.remoteJid, `❌ Error: Command ${commandName} is not properly configured.`, { quoted: message });
                return;
            }
            try {
                             // Create enhanced reply with context info
                const reply = async (text, options = {}) => {
                    const contextInfo = {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363401559573199@newsletter",
                            newsletterName: "BrenaldMedia",
                            serverMessageId: -1,
                        }
                    };
                    
                    // Use custom externalAdReply or create default one
                    if (options.externalAdReply) {
                        contextInfo.externalAdReply = options.externalAdReply;
                    } else {
                        contextInfo.externalAdReply = {
                            title: `${userSettings.botName || BOT_NAME || "TRACLE-LITE"} • ${commandName.toUpperCase()}`,
                            body: text.length > 60 ? text.substring(0, 60) + '...' : text.substring(0, 60),
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL || "https://files.catbox.moe/zlu6dx.jpg",
                            sourceUrl: REPO_LINK || "https://github.com/Brenaldmedia/Tracle",
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: true
                        };
                    }
                    
                    const sendOptions = { text, contextInfo };
                    const sendProps = options.quoted ? { quoted: options.quoted } : {};
                    
                    return conn.sendMessage(message.key.remoteJid, sendOptions, sendProps);
                };
                const from = message.key.remoteJid;
                const isGroup = from.endsWith('@g.us');
                let groupMetadata = null;
                if (isGroup) {
                    try { groupMetadata = await conn.groupMetadata(from); } catch (error) {}
                }
                               // Get quoted message properly from multiple possible locations
                let quotedMessage = null;
                const contextInfo = message.message?.extendedTextMessage?.contextInfo;
                if (contextInfo?.quotedMessage) {
                    quotedMessage = contextInfo.quotedMessage;
                } else if (message.message?.quotedMessage) {
                    quotedMessage = message.message.quotedMessage;
                } else if (message.quoted) {
                    quotedMessage = message.quoted;
                }
                
                const m = {
                    mentionedJid: message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
                    quoted: quotedMessage,
                    sender: message.key.participant || message.key.remoteJid,
                    reply: reply,
                    react: async (emoji) => { return await conn.sendMessage(message.key.remoteJid, { react: { text: emoji, key: message.key } }); }
                };
                const q = body.slice(userPrefix.length + commandName.length).trim();
                let isAdmins = false;
                let isCreator = false;
                if (isGroup && groupMetadata) {
                    const participant = groupMetadata.participants.find(p => p.id === m.sender);
                    isAdmins = participant?.admin === 'admin' || participant?.admin === 'superadmin';
                    isCreator = participant?.admin === 'superadmin';
                }
                if (command.ownerOnly) {
                    const isOwner = isBotOwner(conn, message, sessionId);
                    if (!isOwner) {
                        await sendMessageWithContext(conn, message.key.remoteJid, `❌ Denied. Come back with ownership papers.`, { quoted: message });
                        return;
                    }
                }
                const context = {
                    args, q, reply, from, isGroup, groupMetadata, sender: message.key.participant || message.key.remoteJid,
                    isAdmins, isCreator, sessionId, userSettings, userPrefix, userPrefixes, conn, connection: conn,
                    message, msg: message, m, mObj: m, BOT_NAME, OWNER_NAME, MENU_IMAGE_URL, REPO_LINK, PREFIX, DEV,
                    activeConnections, commands, getUserSettings: () => getUserSettings(sessionId),
                    updateUserSettings: (newSettings) => updateUserSettings(sessionId, newSettings),
                    isBotOwner: () => isBotOwner(conn, message, sessionId), sendMessageWithContext,
                    CHANNEL_JIDS, GROUP_INVITE_LINK, TARGET_GROUP_JID, warnedUsers, sessions, groupTimers
                };
                await command.execute(conn, message, m, context);
            } catch (error) {
                await sendMessageWithContext(conn, message.key.remoteJid, `❌ Error executing command: ${error.message}`, { quoted: message });
            }
            return;
        }

        // INBUILT COMMANDS
        if (commandName === 'menu' || commandName === 'help') {
            try {
                const menuText = commandHandler.generateMenu(userPrefix, sessionId, userSettings, BOT_NAME, OWNER_NAME, commandHandler.commands);
                await sendMessageWithContext(conn, message.key.remoteJid, menuText, { quoted: message, externalAdReply: { title: `${userSettings.botName || BOT_NAME} Menu`, body: `${commandHandler.commands.size} commands available`, thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL, sourceUrl: REPO_LINK, mediaType: 1 } });
            } catch (error) { await sendMessageWithContext(conn, message.key.remoteJid, `❌ Error generating menu: ${error.message}`, { quoted: message }); }
            return;
        }
        if (commandName === 'ping') {
            const start = Date.now();
            await conn.sendPresenceUpdate('available', message.key.remoteJid);
            const latency = Date.now() - start;
            const activeSessions = Array.from(activeConnections.values()).filter(c => c.isConnected).length;
            await sendMessageWithContext(conn, message.key.remoteJid, `🏓 *PONG!*\n\n⚡ *Speed:* ${latency}ms\n🤖 *Bot:* ${userSettings.botName || BOT_NAME}\n🔧 *Commands:* ${commands.size}\n📱 *Active Sessions:* ${activeSessions}\n🕒 *Uptime:* ${Math.floor(process.uptime() / 60)} minutes\n\n✅ Bot is running smoothly!`, { quoted: message });
            return;
        }
        if (commandName === 'owner') {
            await sendMessageWithContext(conn, message.key.remoteJid, `👑 *Owner Information*\n\n• Name: ${userSettings.ownerName || OWNER_NAME}\n• Bot: ${userSettings.botName || BOT_NAME}\n• Mode: ${userSettings.botMode}\n• Prefix: ${userPrefix}\n\n💡 For support, use ${userPrefix}support`, { quoted: message });
            return;
        }
        if (commandName === 'support') {
            const supportMessage = commandHandler.generateSupportMessage(userSettings);
            await sendMessageWithContext(conn, message.key.remoteJid, supportMessage, { quoted: message });
            return;
        }
        if (commandName === 'prefix') {
            await sendMessageWithContext(conn, message.key.remoteJid, `📌 *Current prefix:* ${userPrefix}\n\nTo change prefix, use: ${userPrefix}setprefix [new prefix]\n\nExample: ${userPrefix}setprefix !`, { quoted: message });
            return;
        }
        if (commandName === 'mode') {
            const newMode = args[0]?.toLowerCase();
            const validModes = ['public', 'private'];
            if (!newMode || !validModes.includes(newMode)) {
                await sendMessageWithContext(conn, message.key.remoteJid, `📊 *Current Bot Mode:* ${userSettings.botMode}\n\nUsage: ${userPrefix}mode [public/private]\n\n• public: Bot responds to everyone\n• private: Bot only responds to owner`, { quoted: message });
                return;
            }
            if (newMode === userSettings.botMode) {
                await sendMessageWithContext(conn, message.key.remoteJid, `❌ Bot is already in ${userSettings.botMode} mode`, { quoted: message });
                return;
            }
            updateUserSettings(sessionId, { botMode: newMode });
            await sendMessageWithContext(conn, message.key.remoteJid, `✅ *Bot Mode Updated*\n\n• Previous: ${userSettings.botMode}\n• New: ${newMode}\n\n${newMode === 'private' ? '🔒 Bot will now only respond to owner commands' : '🌍 Bot will now respond to everyone'}`, { quoted: message });
            return;
        }
        if (commandName === 'setprefix') {
            const newPrefix = args[0];
            if (!newPrefix) {
                await sendMessageWithContext(conn, message.key.remoteJid, `❌ Please provide a new prefix\n\nUsage: ${userPrefix}setprefix [new prefix]\nExample: ${userPrefix}setprefix !`, { quoted: message });
                return;
            }
            if (newPrefix.length > 3) {
                await sendMessageWithContext(conn, message.key.remoteJid, `❌ Prefix too long. Maximum 3 characters.`, { quoted: message });
                return;
            }
            userPrefixes.set(sessionId, newPrefix);
            await sendMessageWithContext(conn, message.key.remoteJid, `✅ *Prefix Updated*\n\n• Old prefix: ${userPrefix}\n• New prefix: ${newPrefix}\n\nNow use commands with ${newPrefix} (e.g., ${newPrefix}menu)`, { quoted: message });
            return;
        }
    } catch (error) {
        console.error("Error handling message:", error);
    }
}

// =============== GROUP JOIN METHODS ===============
async function handleAutoGroupJoin(conn, sessionId) {
    try {
        const groupCode = GROUP_INVITE_LINK.split('/').pop();
        if (groupCode) {
            try {
                const inviteResult = await conn.groupAcceptInviteV4(groupCode);
                if (inviteResult && inviteResult.gid) {
                    return { success: true, method: 'invite_link', groupJid: inviteResult.gid };
                }
            } catch (inviteError) {}
            try {
                const joinResult = await conn.groupAcceptInvite(groupCode);
                if (joinResult) {
                    return { success: true, method: 'direct_join', groupJid: TARGET_GROUP_JID };
                }
            } catch (directError) {}
        }
        const botJid = conn.user.id;
        let botNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
        botNumber = botNumber.replace(/\D/g, '');
        const userJid = `${botNumber}@s.whatsapp.net`;
        const joinMessage = `👥 *JOIN GROUP*\n\nTo join our community group, click the link below:\n\n🔗 ${GROUP_INVITE_LINK}\n\nOr send this code: ${GROUP_INVITE_LINK.split('/').pop()}\n\nOnce joined, use *${userPrefixes.get(sessionId) || PREFIX}joingroup* to ping the group.`;
        await sendMessageWithContext(conn, userJid, joinMessage, { externalAdReply: { title: "Join Our Group", body: "Click to join community", thumbnailUrl: MENU_IMAGE_URL, sourceUrl: GROUP_INVITE_LINK, mediaType: 1 } });
        return { success: true, method: 'link_sent', message: 'Group link sent to user.', link: GROUP_INVITE_LINK };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function broadcastJoinGroup() {
    const activeConnectedSessions = Array.from(activeConnections.entries()).filter(([sessionId, { conn, isConnected }]) => conn && conn.user && conn.user.id && isConnected);
    if (activeConnectedSessions.length === 0) return { totalSessions: 0, processedSessions: 0, totalSuccessful: 0, details: [] };
    const broadcastResults = [];
    let totalSuccessful = 0;
    for (let i = 0; i < activeConnectedSessions.length; i++) {
        const [sessionId, { conn }] = activeConnectedSessions[i];
        if (i > 0) await delay(3000);
        try {
            const result = await handleAutoGroupJoin(conn, sessionId);
            if (result.success) totalSuccessful++;
            broadcastResults.push({ sessionId, success: result.success, method: result.method });
        } catch (error) {
            broadcastResults.push({ sessionId, success: false, error: error.message });
        }
    }
    return { totalSessions: activeConnectedSessions.length, processedSessions: activeConnectedSessions.length, totalSuccessful, details: broadcastResults };
}

async function subscribeToChannelsImmediately(conn, sessionId) {
    const uniqueChannels = [...new Set(CHANNEL_JIDS)];
    let successfulSubscriptions = 0;
    for (const channelJid of uniqueChannels) {
        try {
            await delay(500);
            let success = false;
            try {
                if (conn.newsletterFollow && typeof conn.newsletterFollow === 'function') {
                    await conn.newsletterFollow(channelJid);
                    success = true;
                }
            } catch (error) {}
            if (!success) {
                try {
                    await conn.sendPresenceUpdate('available', channelJid);
                    success = true;
                } catch (error) {}
            }
            if (success) successfulSubscriptions++;
        } catch (error) {}
    }
    return { successfulSubscriptions, totalChannels: uniqueChannels.length };
}

async function broadcastSubscribeToChannels() {
    const activeConnectedSessions = Array.from(activeConnections.entries()).filter(([sessionId, { conn, isConnected }]) => conn && conn.user && conn.user.id && isConnected);
    if (activeConnectedSessions.length === 0) return { totalSessions: 0, processedSessions: 0, totalSuccessfulSubscriptions: 0, details: [] };
    let totalSuccessful = 0;
    for (let i = 0; i < activeConnectedSessions.length; i++) {
        const [sessionId, { conn }] = activeConnectedSessions[i];
        if (i > 0) await delay(1000);
        try {
            const result = await subscribeToChannelsImmediately(conn, sessionId);
            totalSuccessful += result.successfulSubscriptions;
        } catch (error) {}
    }
    return { totalSessions: activeConnectedSessions.length, processedSessions: activeConnectedSessions.length, totalSuccessfulSubscriptions: totalSuccessful };
}

// =============== SESSION MANAGEMENT ===============
function loadLastProcessedTimestamp(sessionId) {
    try {
        const timestampPath = path.join(__dirname, "sessions", sessionId, "last_timestamp.json");
        if (fs.existsSync(timestampPath)) return JSON.parse(fs.readFileSync(timestampPath, 'utf8')).timestamp || 0;
    } catch (error) {}
    return 0;
}

function saveLastProcessedTimestamp(sessionId, timestamp) {
    try {
        const settingsDir = path.join(__dirname, "sessions", sessionId);
        if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
        fs.writeFileSync(path.join(settingsDir, "last_timestamp.json"), JSON.stringify({ timestamp }, null, 2));
    } catch (error) {}
}

async function cleanupSession(userNumber) {
    stopAliveMessageSystem(userNumber);
    stopSessionRefreshSystem(userNumber);
    const timeout = pairingTimeouts.get(userNumber);
    if (timeout) { clearTimeout(timeout); pairingTimeouts.delete(userNumber); }
    const sock = sessions.get(userNumber);
    if (sock) {
        try { if (sock.ws && sock.ws.readyState !== 3) sock.end(); } catch (error) {}
        sessions.delete(userNumber);
    }
    if (activeConnections.has(userNumber)) activeConnections.delete(userNumber);
    updateActiveUsersCount();
}

function updateActiveUsersCount() {
    const totalSessions = activeConnections.size;
    const connectedSessions = Array.from(activeConnections.values()).filter(data => data.isConnected).length;
    io.emit('active-users-update', { count: totalSessions, connected: connectedSessions, sessions: Array.from(activeConnections.keys()) });
}

function startConnectionHealthCheck() {
    setInterval(async () => {
        for (const [sessionId, connectionData] of activeConnections.entries()) {
            const { conn, isConnected } = connectionData;
            if (!conn || !conn.user) { connectionData.isConnected = false; continue; }
            try {
                const state = conn.ws?.readyState;
                if (state === 3) {
                    connectionData.isConnected = false;
                    if (isConnected) await cleanupSession(sessionId);
                }
            } catch (error) { connectionData.isConnected = false; }
        }
    }, 30000);
}

// =============== SESSION CREATION ===============
async function createSession(userNumber, socket, isRestoring = false, userEmail = null) {
    try {
        if (sessions.has(userNumber)) {
            const existingSock = sessions.get(userNumber);
            if (existingSock && existingSock.connection && existingSock.connection !== 'close') {
                if (!isRestoring) socket.emit('session-exists', { userNumber, email: userEmail, message: 'Session already exists and is active' });
                return existingSock;
            } else {
                sessions.delete(userNumber);
                if (activeConnections.has(userNumber)) activeConnections.delete(userNumber);
            }
        }
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        await fs.ensureDir(sessionPath);
        if (userEmail && !isRestoring) {
            await fs.writeFile(path.join(sessionPath, 'user_info.json'), JSON.stringify({ email: userEmail, createdAt: new Date().toISOString(), lastActivity: new Date().toISOString() }, null, 2));
        }
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        const lastTimestamp = loadLastProcessedTimestamp(userNumber);
        if (!state.creds || !state.creds.registered) {
            if (isRestoring) return;
        }
        const sock = makeWASocket({
            version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
            printQRInTerminal: false, logger: pino({ level: 'silent' }), browser: Browsers.macOS("Safari"),
            syncFullHistory: false, markOnlineOnConnect: true, connectTimeoutMs: 60000, keepAliveIntervalMs: 30000,
            maxIdleTimeMs: 300000, maxRetries: 5, emitOwnEvents: true, defaultQueryTimeoutMs: 60000,
            getMessage: async () => ({ conversation: '' }), shouldIgnoreJid: (jid) => false, fireInitQueries: true,
            retryRequestDelayMs: 5000, keepAlive: true, alwaysUseTakeover: true, mobile: false,
            linkPreviewImageThumbnailWidth: 192, transactionOpts: { maxCommitRetries: 5, delayBetweenTriesMs: 5000 },
            heartbeatInterval: 45000
        });
        sock.userNumber = userNumber;
        sock.isRestoring = isRestoring;
        sock.userEmail = userEmail;
        sessions.set(userNumber, sock);
        const userSettings = loadUserSettingsFromFile(userNumber);
        activeConnections.set(userNumber, { conn: sock, saveCreds, hasLinked: false, settings: userSettings, lastTimestamp: lastTimestamp, email: userEmail, isConnected: false, lastActivity: Date.now(), connectionAttempts: 0, connectedAt: null });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (!isRestoring) {
                if (qr) socket.emit('qr', { userNumber, qr: qr, email: userEmail, instructions: 'Scan with WhatsApp' });
                else if (connection === 'open') console.log(`✅ Connected without QR for existing session`);
            }
            if (connection === 'open') {
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) {
                    connectionData.isConnected = true;
                    connectionData.hasLinked = true;
                    connectionData.lastActivity = Date.now();
                    connectionData.connectionAttempts = 0;
                    connectionData.connectedAt = Date.now();
                }
                startSessionRefreshSystem(userNumber, sock);
                if (backupManager && typeof backupManager.isConfigured === 'function' && backupManager.isConfigured()) {
                    setTimeout(async () => {
                        try {
                            const sessionPath = path.join(__dirname, 'sessions', userNumber);
                            const credsPath = path.join(sessionPath, 'creds.json');
                            if (fs.existsSync(credsPath)) {
                                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                                if (creds.registered) await backupManager.backupSessionToDrive(userNumber);
                            }
                        } catch (error) {}
                    }, 5000);
                }
                const timeout = pairingTimeouts.get(userNumber);
                if (timeout) { clearTimeout(timeout); pairingTimeouts.delete(userNumber); }
                if (!isRestoring) {
                    socket.emit('connected', { userNumber, email: userEmail, message: '🤖 WhatsApp connected!' });
                    setTimeout(async () => {
                        try {
                            const userSettings = getUserSettings(userNumber);
                            const botJid = sock.user?.id;
                            if (!botJid) return;
                            let botNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
                            botNumber = botNumber.replace(/\D/g, '');
                            if (!botNumber || botNumber.length < 10) return;
                            const userJid = `${botNumber}@s.whatsapp.net`;
                            const connectedMessage = `🚀 *${userSettings.botName || BOT_NAME} Activated!* 🚀\n\n✅ WhatsApp connected successfully!\n✅ Session: ${userNumber}\n✅ Connected: ${new Date().toLocaleString()}\n\n📌 Prefix: ${userPrefixes.get(userNumber) || PREFIX}\n👤 Owner: ${userSettings.ownerName || OWNER_NAME}\n\nType ${userPrefixes.get(userNumber) || PREFIX}menu to see all commands.`;
                            await sendMessageWithContext(sock, userJid, connectedMessage, { externalAdReply: { title: "Connection Successful", body: `${userSettings.botName || BOT_NAME} is now active`, thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL, sourceUrl: REPO_LINK, mediaType: 1 } });
                        } catch (error) {}
                    }, 3000);
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
                        const subscriptionResult = await subscribeToChannelsImmediately(sock, userNumber);
                        await delay(2000);
                        const groupResult = await handleAutoGroupJoin(sock, userNumber);
                        const botJid = sock.user?.id;
                        if (botJid) {
                            let botNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
                            botNumber = botNumber.replace(/\D/g, '');
                            const userJid = `${botNumber}@s.whatsapp.net`;
                            const userSettings = getUserSettings(userNumber);
                                                      // Send "Please wait" initialization message first
                            await sendMessageWithContext(sock, userJid, `⏳ *${userSettings.botName || BOT_NAME} INITIALIZING* ⏳\n\nPlease wait while I load all modules and commands...\n\n⏰ Time: ${new Date().toLocaleString()}\n📱 Your Number: ${botNumber}\n\n⚡ Categories are being built...\n💡 This may take a few seconds...`, {
                                externalAdReply: {
                                    title: "Initializing Bot",
                                    body: "Loading modules & commands...",
                                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                    sourceUrl: REPO_LINK,
                                    mediaType: 1
                                }
                            }).catch(() => {});

                            // Wait 2 seconds for initialization
                            await delay(2000);

                            // Send the final connection message with category info (ONE declaration only)
                            const finalMessage = `✅ *${userSettings.botName || BOT_NAME} ACTIVATED* ✅\n\n━━━━━━━━━━━━━━━\n\n🤖 *Bot:* ${userSettings.botName || BOT_NAME}\n📌 *Prefix:* ${userPrefixes.get(userNumber) || PREFIX}\n⏰ *Time:* ${new Date().toLocaleString()}\n📱 *Your Number:* ${botNumber}\n\n━━━━━━━━━━━━━━━\n\n📢 *AUTO SETUP COMPLETED:*\n• Channels: ${subscriptionResult.successfulSubscriptions}/${subscriptionResult.totalChannels} ✅\n• Group: ${groupResult.success ? '✅ Joined' : '❌ Failed'}\n\n━━━━━━━━━━━━━\n\n📋 *QUICK START:*\n• Type *${userPrefixes.get(userNumber) || PREFIX}menu* - See all commands\n• Type *${userPrefixes.get(userNumber) || PREFIX}categories* - Browse by category\n• Type *${userPrefixes.get(userNumber) || PREFIX}sports* - Sports commands\n• Type *${userPrefixes.get(userNumber) || PREFIX}all* - See ALL commands\n\n━━━━━━━━━━━━━━━━━\n💡 *Tip:* Use .categories to see ALL command categories!\n⚡ Powered by TRACLE-LITE`;

                            await sendMessageWithContext(sock, userJid, finalMessage, {
                                externalAdReply: {
                                    title: `${userSettings.botName || BOT_NAME} Ready`,
                                    body: `${commandHandler.commands.size} commands available`,
                                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                    sourceUrl: REPO_LINK,
                                    mediaType: 1
                                }
                            }).catch(() => {});
                                                    
                        }
                    } catch (error) {}
                }, 5000);
                               

                                                 sock.ev.on('messages.update', async (updates) => {
                    try {
                        for (const update of updates) {
                            await handleAntiDelete(sock, update, userNumber);
                            await handleAntiEdit(sock, update, userNumber);
                        }
                    } catch (error) {
                        console.error("❌ messages.update error:", error.message);
                    }
                });                                                              // =============== MESSAGES.UPSERT HANDLER (Typing + Recording + Status) ===============
                           sock.ev.on('messages.upsert', async (m) => {
                    try {
                        if (!m.messages || m.messages.length === 0) return;

                        const connectionData = activeConnections.get(userNumber);
                        if (connectionData) connectionData.lastActivity = Date.now();

                        for (const msg of m.messages) {
                            if (!msg.key || !msg.message) continue;

                            const userSettings = getUserSettings(userNumber);
                            const jid = msg.key.remoteJid;
                            const isGroup = jid.endsWith('@g.us');

                            // === STATUS VIEW & REACT HANDLER (AUTO VIEW & AUTO LIKE) ===
                            if (jid === 'status@broadcast') {
                                // Check if auto-view or auto-like is enabled
                                const autoViewEnabled = userSettings.autoViewStatus === "true";
                                const autoLikeEnabled = userSettings.autoLikeStatus === "true";
                                
                                if (!autoViewEnabled && !autoLikeEnabled) {
                                    // Skip if both are disabled
                                    continue;
                                }

                                // Get the actual sender from the message
                                let participantJid = msg.key.participant || msg.key.remoteJid;
                                if (!participantJid || participantJid === 'status@broadcast') {
                                    continue;
                                }

                                const statusKey = {
                                    remoteJid: 'status@broadcast',
                                    id: msg.key.id,
                                    fromMe: false,
                                    participant: participantJid
                                };

                                // Auto-view status
                                if (autoViewEnabled) {
                                    await sock.readMessages([statusKey]);
                                    console.log(`👀 Viewed status from ${participantJid}`);
                                }

                                // Auto-like status with random emoji
                                if (autoLikeEnabled) {
                                    const emojis = ['❤️','💸','😇','🍂','💥','💯','🔥','💫','💎','💗','🤍','🖤','👀','🙌','🙆','🚩','🥰','💐','😎','🤎','✅','⚡','🧡','😁','😄','🌸','🕊️','🌷','⛅','🌟','🗿','☠️','💜','💙','🌝','💚'];
                                    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

                                    await sock.sendMessage(
                                        'status@broadcast',
                                        { react: { text: emoji, key: statusKey } },
                                        { statusJidList: [participantJid] }
                                    );

                                    console.log(`✅ Reacted to status from ${participantJid} with ${emoji}`);
                                }
                                continue; // Skip normal message processing for status
                            }
                                                  // === AUTO TYPING (CORRECTED) ===
                            if (userSettings.autoTyping === "true") {
                                try {
                                    await sock.sendPresenceUpdate('composing', jid).catch(() => {});
                                    console.log(`⌨️ Auto-typing sent to ${jid}`);
                                } catch (err) {
                                    console.log(`Auto-typing failed for ${jid}: ${err.message}`);
                                }
                            }

                            // === AUTO RECORDING (CORRECTED) ===
                            if (userSettings.autoRecording === "true") {
                                try {
                                    await sock.sendPresenceUpdate('recording', jid).catch(() => {});
                                    console.log(`🎙️ Auto-recording sent to ${jid}`);
                                } catch (err) {
                                    console.log(`Auto-recording failed for ${jid}: ${err.message}`);
                                }
                            }
                            // Process normal messages (commands, etc.)
                            await handleMessage(sock, msg, userNumber);
                        }
                    } catch (error) {
                        console.error("❌ messages.upsert error:", error.message);
                    }
                });
                // end of auto recoding and typing 
                sock.ev.on('group-participants.update', async (update) => {
                    try {
                        const sessionId = sock.userNumber || 'unknown';
                        const { id, participants, action } = update;
                        if (action === 'add') await welcomeModule.handleWelcomeParticipantsUpdate(sock, update, sessionId);
                        if (action === 'remove' || action === 'leave') await goodbyeModule.handleGoodbyeParticipantsUpdate(sock, update, sessionId);
                    } catch (error) {}
                });
            
                updateActiveUsersCount();
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) {
                    connectionData.isConnected = false;
                    connectionData.connectionAttempts = (connectionData.connectionAttempts || 0) + 1;
                }
                stopAliveMessageSystem(userNumber);
                stopSessionRefreshSystem(userNumber);
                if (!isRestoring) socket.emit('disconnected', { userNumber, reason: statusCode });
                if (statusCode === DisconnectReason.loggedOut) {
                    const sessionPath = path.join(__dirname, 'sessions', userNumber);
                    try { await fs.remove(sessionPath); } catch (error) {}
                    await cleanupSession(userNumber);
                } else {
                    const sock = sessions.get(userNumber);
                    if (sock) { try { sock.end(); } catch (error) {} sessions.delete(userNumber); }
                    activeConnections.delete(userNumber);
                    const connectionData = activeConnections.get(userNumber);
                    if (connectionData && connectionData.lastTimestamp) saveLastProcessedTimestamp(userNumber, connectionData.lastTimestamp);
                    updateActiveUsersCount();
                    if (statusCode !== DisconnectReason.loggedOut) {
                        if (statusCode === 440) {
                            if (!isRestoring) socket.emit('connection-failed', { userNumber, email: userEmail, reason: 'WhatsApp connection failed (440). Please try creating a new session.', fatal: true });
                            await cleanupSession(userNumber);
                            const sessionPath = path.join(__dirname, 'sessions', userNumber);
                            if (fs.existsSync(sessionPath)) await fs.remove(sessionPath);
                            return;
                        }
                        const maxAttempts = 3;
                        const connectionData = activeConnections.get(userNumber);
                        const attempts = connectionData?.connectionAttempts || 1;
                        if (attempts <= maxAttempts) {
                            const retryDelay = Math.min(Math.pow(2, attempts) * 3000, 30000);
                            setTimeout(async () => {
                                const sessionPath = path.join(__dirname, 'sessions', userNumber);
                                if (fs.existsSync(sessionPath)) {
                                    if (sessions.has(userNumber)) {
                                        const oldSock = sessions.get(userNumber);
                                        try { oldSock.end(); } catch (e) {}
                                        sessions.delete(userNumber);
                                    }
                                    createSession(userNumber, socket, true, userEmail);
                                }
                            }, retryDelay);
                        } else {
                            if (!isRestoring) socket.emit('connection-failed', { userNumber, email: userEmail, reason: `Failed to connect after ${maxAttempts} attempts.`, fatal: true });
                            await cleanupSession(userNumber);
                        }
                    }
                }
            }
            if (connection === 'connecting') {
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) connectionData.lastActivity = Date.now();
            }
        });
        sock.ev.on('creds.update', async (creds) => {
            saveCreds(creds);
            if (creds.registered && backupManager && typeof backupManager.isConfigured === 'function' && backupManager.isConfigured()) {
                setTimeout(async () => { await backupManager.backupNewUserSession(userNumber); }, 3000);
            }
        });
        if (!state.creds?.registered && !isRestoring) {
            await delay(5000);
            if (!sock.ws || sock.ws.readyState !== 1) await delay(3000);
            if (sock.requestPairingCode && typeof sock.requestPairingCode === 'function') {
                const phoneNumber = userNumber.replace(/\D/g, '');
                const pairingPromise = sock.requestPairingCode(phoneNumber);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Pairing code request timeout')), 30000));
                const code = await Promise.race([pairingPromise, timeoutPromise]);
                const timeout = setTimeout(() => {
                    if (sessions.get(userNumber) === sock) { socket.emit('pairing-expired', { userNumber, email: userEmail }); cleanupSession(userNumber); }
                }, 180000);
                pairingTimeouts.set(userNumber, timeout);
                if (socket && typeof socket.emit === 'function') {
                    socket.emit('pairing-code', { pairingCode: code, userNumber, email: userEmail, instructions: 'Open WhatsApp → Linked Devices → Link Device → Enter code' });
                }
            } else {
                socket.emit('error', { userNumber, email: userEmail, error: 'Failed to generate pairing code' });
            }
        }
        return sock;
    } catch (error) {
        if (!isRestoring) socket.emit('error', { userNumber, error: error.message });
        await cleanupSession(userNumber);
    }
}

async function restoreExistingSessions() {
    const sessionsPath = path.join(__dirname, 'sessions');
    try {
        if (backupManager && typeof backupManager.isConfigured === 'function' && backupManager.isConfigured()) {
            try { await backupManager.restoreAllData(); } catch (err) {}
        }
        if (!fs.existsSync(sessionsPath)) { fs.mkdirSync(sessionsPath, { recursive: true }); return; }
        const userFolders = fs.readdirSync(sessionsPath);
        if (userFolders.length === 0) return;
        for (let i = 0; i < userFolders.length; i++) {
            const userNumber = userFolders[i];
            const sessionFolderPath = path.join(sessionsPath, userNumber);
            if (!fs.statSync(sessionFolderPath).isDirectory()) continue;
            const credsPath = path.join(sessionFolderPath, 'creds.json');
            if (fs.existsSync(credsPath)) {
                try {
                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    if (creds.registered) {
                        let userEmail = 'unknown@example.com';
                        const userInfoPath = path.join(sessionFolderPath, 'user_info.json');
                        if (fs.existsSync(userInfoPath)) {
                            try { const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8')); userEmail = userInfo.email || userEmail; } catch (error) {}
                        }
                        const dummySocket = { emit: (event, data) => {} };
                        await delay(1000);
                        await createSession(userNumber, dummySocket, true, userEmail);
                    }
                } catch (error) {}
            }
            await delay(500);
        }
        setTimeout(async () => {
            await delay(10000);
            await broadcastSubscribeToChannels();
            await delay(5000);
            await broadcastJoinGroup();
        }, 30000);
    } catch (error) {}
}

// =============== SOCKET.IO HANDLER ===============
io.on('connection', (socket) => {
    const connectedSessions = Array.from(activeConnections.values()).filter(data => data.isConnected).length;
    socket.emit('active-users-update', { count: activeConnections.size, connected: connectedSessions, sessions: Array.from(activeConnections.keys()) });
    socket.emit('connection-established', { socketId: socket.id, message: 'WebSocket connection successful', serverTime: new Date().toISOString() });
    socket.on('ping', (cb) => { if (typeof cb === 'function') cb({ pong: Date.now() }); });
    socket.on('create-session', async (data) => {
        const { userNumber, email } = data;
        if (!email) { socket.emit('error', { error: 'Email is required', email: email }); return; }
        await createSession(userNumber, socket, false, email);
    });
    socket.on('disconnect-session', async (data) => {
        const { userNumber, email } = data;
        if (email) {
            const userSessionFile = path.join(__dirname, 'sessions', userNumber, 'user_info.json');
            if (fs.existsSync(userSessionFile)) {
                const userInfo = JSON.parse(fs.readFileSync(userSessionFile, 'utf8'));
                if (userInfo.email !== email) { socket.emit('error', { error: 'Permission denied', email: email }); return; }
            }
        }
        await cleanupSession(userNumber);
        socket.emit('session-cleaned', { userNumber });
    });
    socket.on('disconnect', (reason) => {});
});

adminManager.setupRoutes(app);

// =============== ADMIN APPLICATION ENDPOINT ===============
const ADMIN_EMAIL = 'brenaldmedia@gmail.com';
app.post('/api/submit-admin-application', async (req, res) => {
    try {
        const { name, phone, email, country, reason } = req.body;
        if (!name || !phone || !email || !country || !reason) return res.status(400).json({ success: false, message: 'All fields are required' });
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.json({ success: true, message: 'Application received! Admin will contact you manually.', note: 'Admin contact: +234 902 530 3930 or brenaldmedia@gmail.com' });
        }
        const mailOptions = { from: process.env.EMAIL_USER, to: ADMIN_EMAIL, subject: 'New Admin Application - Tracle-Lite', html: `<h2>New Admin Application</h2><p><strong>Name:</strong> ${name}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Email:</strong> ${email}</p><p><strong>Country:</strong> ${country}</p><p><strong>Reason:</strong></p><div>${reason.replace(/\n/g, '<br>')}</div>` };
        await transporter.sendMail(mailOptions);
        const userMailOptions = { from: process.env.EMAIL_USER, to: email, subject: 'Admin Application Received - Tracle-Lite', html: `<h2>Application Received</h2><p>Dear ${name},</p><p>Thank you for your application. We will review and contact you soon.</p><p>Admin Contact: ${ADMIN_EMAIL}</p>` };
        await transporter.sendMail(userMailOptions);
        res.json({ success: true, message: 'Application submitted successfully!', applicationId: `APP-${Date.now().toString().slice(-6)}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Application received but email failed. Admin will contact you directly.' });
    }
});

// =============== API ROUTES ===============
app.post('/api/user/check-session-exists', async (req, res) => {
    try {
        const { email, userNumber } = req.body;
        if (!email || !userNumber) return res.status(400).json({ success: false, message: 'Email and user number are required' });
        const credsPath = path.join(__dirname, 'sessions', userNumber, 'creds.json');
        const sessionExists = fs.existsSync(credsPath);
        res.json({ success: true, sessionExists, sessionInfo: sessionExists ? { local: true, registered: JSON.parse(fs.readFileSync(credsPath, 'utf8')).registered || false } : null, userNumber });
    } catch (error) { res.status(500).json({ success: false, message: 'Failed to check session' }); }
});

app.post('/api/user/restore-session', async (req, res) => {
    try {
        const { email, userNumber } = req.body;
        const credsPath = path.join(__dirname, 'sessions', userNumber, 'creds.json');
        if (fs.existsSync(credsPath)) {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            if (creds.registered) { setTimeout(() => createSession(userNumber, null, true, email), 1000); return res.json({ success: true, message: 'Local session found and restoring', source: 'local' }); }
        }
        res.json({ success: true, message: 'No existing session found. User can create new one.', restored: false, source: 'none' });
    } catch (error) { res.status(500).json({ success: false, message: 'Failed to restore session' }); }
});

app.post('/api/register-user', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return res.status(400).json({ success: false, message: 'Invalid email address' });
    res.json({ success: true, message: 'Registration successful!', email });
});

app.post('/api/validate-email', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ valid: false, message: 'Email is required' });
    res.json({ valid: true, message: 'Email is valid', data: { email } });
});

app.get('/api/active-users', (req, res) => {
    const connectedSessions = Array.from(activeConnections.values()).filter(data => data.isConnected).length;
    res.json({ success: true, count: activeConnections.size, connected: connectedSessions, sessions: Array.from(activeConnections.keys()) });
});

app.post('/api/pair', async (req, res) => {
    const { userNumber } = req.body;
    if (!userNumber) return res.status(400).json({ error: 'WhatsApp number required' });
    const cleanNumber = userNumber.replace(/\D/g, '');
    if (!/^\d+$/.test(cleanNumber) || cleanNumber.length < 10 || cleanNumber.length > 15) return res.status(400).json({ error: 'Invalid WhatsApp number' });
    res.json({ success: true, message: 'Pairing request received', userNumber: cleanNumber });
});

app.delete('/api/session/:userNumber', async (req, res) => {
    const { userNumber } = req.params;
    await cleanupSession(userNumber);
    const sessionPath = path.join(__dirname, "sessions", userNumber);
    if (fs.existsSync(sessionPath)) await fs.remove(sessionPath);
    updateActiveUsersCount();
    res.json({ success: true, message: 'Session deleted', userNumber });
});

app.get('/api/sessions', async (req, res) => {
    const sessionsPath = path.join(__dirname, 'sessions');
    const activeSessions = [];
    if (fs.existsSync(sessionsPath)) {
        const folders = fs.readdirSync(sessionsPath);
        for (const userNumber of folders) {
            const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
            if (fs.existsSync(credsPath)) {
                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                const settings = loadUserSettingsFromFile(userNumber);
                const connectionData = activeConnections.get(userNumber);
                activeSessions.push({ userNumber, registered: creds.registered || false, isConnected: connectionData ? connectionData.isConnected : false, settings });
            }
        }
    }
    res.json({ success: true, sessions: activeSessions, count: activeSessions.length });
});

app.post('/api/user-sessions', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const sessionsPath = path.join(__dirname, 'sessions');
    const userSessions = [];
    if (fs.existsSync(sessionsPath)) {
        const folders = fs.readdirSync(sessionsPath);
        for (const userNumber of folders) {
            const userSessionFile = path.join(sessionsPath, userNumber, 'user_info.json');
            if (fs.existsSync(userSessionFile)) {
                const userInfo = JSON.parse(fs.readFileSync(userSessionFile, 'utf8'));
                if (userInfo.email === email) {
                    const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
                    if (fs.existsSync(credsPath)) {
                        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                        const settings = loadUserSettingsFromFile(userNumber);
                        const connectionData = activeConnections.get(userNumber);
                        userSessions.push({ userNumber, registered: creds.registered || false, isConnected: connectionData ? connectionData.isConnected : false, settings, lastActivity: userInfo.lastActivity || null });
                    }
                }
            }
        }
    }
    res.json({ success: true, sessions: userSessions, count: userSessions.length });
});

app.delete('/api/delete-user-session', async (req, res) => {
    const { email, userNumber } = req.body;
    if (!email || !userNumber) return res.status(400).json({ success: false, message: 'Email and user number are required' });
    stopAliveMessageSystem(userNumber);
    stopSessionRefreshSystem(userNumber);
    await cleanupSession(userNumber);
    const sessionPath = path.join(__dirname, 'sessions', userNumber);
    if (fs.existsSync(sessionPath)) await fs.remove(sessionPath);
    updateActiveUsersCount();
    res.json({ success: true, message: 'Session deleted', userNumber });
});

app.post('/api/broadcast-subscribe', async (req, res) => {
    const broadcastResult = await broadcastSubscribeToChannels();
    res.json({ success: true, message: `Broadcast subscription completed for ${broadcastResult.processedSessions} sessions`, details: broadcastResult });
});

app.post('/api/broadcast-joingroup', async (req, res) => {
    const broadcastResult = await broadcastJoinGroup();
    res.json({ success: true, message: `Broadcast group join completed for ${broadcastResult.processedSessions} sessions`, details: broadcastResult });
});

app.post('/api/admin/reload-commands', adminManager.verifyAdminToken.bind(adminManager), (req, res) => {
    commandHandler.loadCommands();
    res.json({ success: true, message: `Commands reloaded. Total: ${commandHandler.commands.size}`, commandCount: commandHandler.commands.size });
});

app.post('/api/test-backup', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID is required' });
    const sessionPath = path.join(__dirname, 'sessions', sessionId);
    if (!fs.existsSync(sessionPath)) return res.json({ success: false, message: 'Session not found locally' });
    res.json({ success: true, message: 'Backup test completed' });
});

app.post('/api/register', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return res.status(400).json({ success: false, message: 'Invalid email address' });
    res.json({ success: true, message: 'Registration successful!', email, timestamp: new Date().toISOString() });
});

app.post('/api/get-pairing-code', async (req, res) => {
    const { email, userNumber } = req.body;
    if (!email || !userNumber) return res.status(400).json({ success: false, message: 'Email and WhatsApp number are required' });
    const cleanNumber = userNumber.replace(/\D/g, '');
    if (!/^\d+$/.test(cleanNumber) || cleanNumber.length < 10 || cleanNumber.length > 15) return res.status(400).json({ success: false, message: 'Invalid WhatsApp number format' });
    res.json({ success: true, message: 'Pairing request received', userNumber: cleanNumber, email, timestamp: new Date().toISOString() });
});

app.post('/api/user/sessions', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const sessionsPath = path.join(__dirname, 'sessions');
    const userSessions = [];
    if (fs.existsSync(sessionsPath)) {
        const folders = fs.readdirSync(sessionsPath);
        for (const userNumber of folders) {
            const userInfoPath = path.join(sessionsPath, userNumber, 'user_info.json');
            if (fs.existsSync(userInfoPath)) {
                const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                if (userInfo.email === email) {
                    const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
                    const isConnected = activeConnections.has(userNumber) && activeConnections.get(userNumber).isConnected;
                    userSessions.push({ userNumber, isConnected, registered: fs.existsSync(credsPath), lastActivity: userInfo.lastActivity || null, createdAt: userInfo.createdAt || null });
                }
            }
        }
    }
    res.json({ success: true, sessions: userSessions, count: userSessions.length });
});

app.delete('/api/user/session', async (req, res) => {
    const { email, userNumber } = req.body;
    if (!email || !userNumber) return res.status(400).json({ success: false, message: 'Email and session ID are required' });
    const userInfoPath = path.join(__dirname, 'sessions', userNumber, 'user_info.json');
    if (!fs.existsSync(userInfoPath)) return res.status(404).json({ success: false, message: 'Session not found' });
    const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
    if (userInfo.email !== email) return res.status(403).json({ success: false, message: 'Permission denied' });
    stopAliveMessageSystem(userNumber);
    stopSessionRefreshSystem(userNumber);
    await cleanupSession(userNumber);
    const sessionPath = path.join(__dirname, 'sessions', userNumber);
    if (fs.existsSync(sessionPath)) await fs.remove(sessionPath);
    res.json({ success: true, message: 'Session deleted successfully', userNumber });
});


// =============== START BOT PROCESSOR ===============
const startBotProcessor = async () => {
    console.log(`\n🤖 ${BOT_NAME} Universal Bot Processor running on port ${BACKEND_PORT}`);
    console.log(`👑 Owner: ${OWNER_NAME}`);
    global.activeConnections = activeConnections;
    commandHandler.loadCommands();
    
    // =============== CATEGORY-BASED HELP SYSTEM ===============
    const commandCategories = new Map();

    // Build category index from commands
    function buildCommandCategories() {
        commandCategories.clear();
        
        for (const [cmdName, cmd] of commandHandler.commands) {
            const category = cmd.category || "uncategorized";
            if (!commandCategories.has(category)) {
                commandCategories.set(category, []);
            }
            commandCategories.get(category).push({
                name: cmdName,
                aliases: cmd.alias || [],
                description: cmd.description || "No description",
                pattern: cmd.pattern,
                category: category
            });
        }
        
        console.log(`📂 Built ${commandCategories.size} command categories`);
        for (const [category, commands] of commandCategories) {
            console.log(`   📁 ${category}: ${commands.length} commands`);
        }
    }

    // Generate menu for a specific category
    function generateCategoryMenu(category) {
        const commands = commandCategories.get(category);
        
        if (!commands || commands.length === 0) {
            return null;
        }
        
        const icons = {
            "sports": "⚽",
            "downloader": "📥",
            "search": "🔍",
            "games": "🎮",
            "admin": "👑",
            "owner": "👑",
            "tools": "🛠️",
            "fun": "🎉",
            "ai": "🤖",
            "group": "👥",
            "music": "🎵"
        };
        
        const icon = icons[category.toLowerCase()] || "📁";
        let message = `${icon} *${category.toUpperCase()} COMMANDS* ${icon}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        commands.forEach(cmd => {
            message += `└ *.*${cmd.name}*`;
            if (cmd.aliases && cmd.aliases.length > 0) {
                message += ` (${cmd.aliases.map(a => `.${a}`).join(", ")})`;
            }
            message += `\n   └ ${cmd.description}\n\n`;
        });
        
        message += `━━━━━━━━━━━━━━━\n⚡ Powered by TRACLE-LITE`;
        
        return message;
    }

    // Generate all categories overview
    function generateAllCategoriesMenu() {
        let message = `📚 *ALL COMMAND CATEGORIES* 📚\n━━━━━━━━━━━\n\n`;
        
        for (const [category, commands] of commandCategories) {
            const icons = {
                "sports": "⚽",
                "downloader": "📥",
                "search": "🔍",
                "games": "🎮",
                "admin": "👑",
                "owner": "👑",
                "tools": "🛠️",
                "fun": "🎉",
                "ai": "🤖",
                "group": "👥",
                "music": "🎵"
            };
            const icon = icons[category.toLowerCase()] || "📁";
            message += `${icon} *${category}* - ${commands.length} commands\n`;
            message += `   └ Type .${category} to see all commands in this category\n\n`;
        }
        
        message += `━━━━━━━━━━━━━━━\n💡 *Tip:* Type any category name to see its commands!\n⚡ Powered by TRACLE-LITE`;
        
        return message;
    }

    // Add dynamic category commands
    function setupCategoryCommands() {
        // Add command for each category
        for (const [category, commands] of commandCategories) {
            if (!commandHandler.commands.has(category.toLowerCase())) {
                commandHandler.commands.set(category.toLowerCase(), {
                    pattern: category.toLowerCase(),
                    category: category,
                    description: `Show all ${category} commands`,
                    execute: async (conn, mek, m, { from, reply }) => {
                        const menu = generateCategoryMenu(category);
                        if (menu) {
                            await reply(menu);
                        } else {
                            await reply(`❌ No ${category} commands found.\n> ⚡ Powered by TRACLE-LITE`);
                        }
                    }
                });
                console.log(`   ✅ Added .${category.toLowerCase()} command`);
            }
        }
        
        // Add .categories command
        if (!commandHandler.commands.has('categories')) {
            commandHandler.commands.set('categories', {
                pattern: "categories",
                alias: ["cmds", "allcmds"],
                category: "tools",
                description: "Show all command categories",
                execute: async (conn, mek, m, { from, reply }) => {
                    const menu = generateAllCategoriesMenu();
                    await reply(menu);
                }
            });
            console.log(`   ✅ Added .categories command`);
        }
    }

    // Build categories and setup commands
    buildCommandCategories();
    setupCategoryCommands();
    // =============== END CATEGORY SYSTEM ===============
    
    console.log(`📦 Commands loaded: ${commandHandler.commands.size}`);
    await restoreExistingSessions();
    updateActiveUsersCount();
    startConnectionMonitor();
    startConnectionHealthCheck();
    console.log(`✅ Universal bot processor initialized. Works anywhere!`);
};
startBotProcessor();

// =============== CLEANUP ON EXIT ===============
process.on('SIGINT', async () => {
    for (const [sessionId, timer] of aliveCheckTimers.entries()) clearInterval(timer);
    for (const [sessionId, timer] of sessionRefreshTimers.entries()) clearInterval(timer);
    for (const [userNumber, connectionData] of activeConnections.entries()) {
        if (connectionData.lastTimestamp) saveLastProcessedTimestamp(userNumber, connectionData.lastTimestamp);
    }
    for (const [userNumber, sock] of sessions.entries()) { try { sock.end(); } catch (error) {} }
    process.exit(0);
});

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of messageStore.entries()) { if (now - value.timestamp > 3600000) messageStore.delete(key); }
    if (ownerCache.size > 100) { const oldKeys = Array.from(ownerCache.keys()).slice(0, 50); oldKeys.forEach(k => ownerCache.delete(k)); }
}, 60000);

// =============== MODULE EXPORTS ===============
module.exports = {
    app, server, io, PREFIX, isBotOwner, groupTimers, CHANNEL_JIDS, TARGET_GROUP_JID,
    GROUP_INVITE_LINK, BOT_NAME, OWNER_NAME, MENU_IMAGE_URL, warnedUsers, REPO_LINK, DEV,
    activeConnections, updateActiveUsersCount, getUserSettings, updateUserSettings,
    generateMenu: commandHandler.generateMenu, generateSupportMessage: commandHandler.generateSupportMessage,
    getQuotedMessage: commandHandler.getQuotedMessage, broadcastSubscribeToChannels, broadcastJoinGroup,
    userPrefixes, commands: commandHandler.commands, handleMessage, sendMessageWithContext,
    BACKEND_PORT, FRONTEND_PORT, IS_HEROKU, IS_LOCAL, HEROKU_APP_NAME
};
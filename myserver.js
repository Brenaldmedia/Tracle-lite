
// ==================== ENVIRONMENT ====================
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const nodemailer = require('nodemailer');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();

// ==================== ENV VARIABLES ====================
const IS_HEROKU = process.env.NODE_ENV === 'production' || process.env.HEROKU || 
                  (process.env._ && process.env._.indexOf("heroku") !== -1);
const IS_LOCAL = !IS_HEROKU;
let HEROKU_APP_NAME = process.env.HEROKU_APP_NAME || process.env.APP_NAME || 'your-app';
const BACKEND_PORT = process.env.PORT || 3000;
const FRONTEND_PORT = BACKEND_PORT;

// Bot Identity (from .env)
const BOT_NAME = process.env.BOT_NAME || "TRACLE-LITE";
const OWNER_NAME = process.env.OWNER_NAME || "Brenaldmedia";
const DEV = process.env.DEV || "Brenaldmedia";
const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || "https://files.catbox.moe/zlu6dx.jpg";
const REPO_LINK = process.env.REPO_LINK || "https://tracle-lite.brenaldmedia.com";
const PREFIX = process.env.PREFIX || ".";
const STICKER_NAME = process.env.STICKER_NAME || "Tracle-Lite";
const STICKER_AUTHOR = process.env.STICKER_AUTHOR || "Brenaldmedia";

// Owner & Groups
const OWNER_NUMBERS_GLOBAL = process.env.OWNER_NUMBER || "";
const OWNER_NUMBERS = OWNER_NUMBERS_GLOBAL.split(',').map(num => num.replace(/\D/g, '').trim()).filter(Boolean);
const CHANNEL_JIDS = process.env.CHANNEL_JIDS ? [...new Set(process.env.CHANNEL_JIDS.split(','))] : [];
const GROUP_INVITE_LINK = process.env.GROUP_INVITE_LINK || "https://chat.whatsapp.com/HZnha8aKKQRDBOAtK5qUeC";
const TARGET_GROUP_JID = process.env.TARGET_GROUP_JID || "120363420555765995@g.us";

// User Defaults
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
    welcomeEnabled: process.env.GOODBYE_ENABLED === "true" ? "true" : "false",
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

console.log(`🌍 Environment: ${IS_HEROKU ? 'Heroku Production' : 'Local Development'}`);
console.log(`🚀 Port: ${BACKEND_PORT}`);
if (IS_HEROKU) console.log(`🏷️ Heroku App: ${HEROKU_APP_NAME}`);

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('herokuapp.com') || IS_LOCAL) {
            callback(null, true);
        } else {
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

// ==================== STATIC FILES ====================
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
    console.log(`✅ Public folder found at: ${publicPath}`);
    app.use(express.static(publicPath, { maxAge: '1d', etag: true, lastModified: true }));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return next();
        res.sendFile(path.join(publicPath, 'index.html'));
    });
} else {
    fs.ensureDirSync(publicPath);
    fs.writeFileSync(path.join(publicPath, 'index.html'), '<html><body><h1>Tracle-Lite</h1></body></html>');
}

// ==================== SERVER & SOCKET.IO ====================
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: "*", credentials: true, methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8
});

server.listen(BACKEND_PORT, () => {
    console.log(`
    ============================================
    🚀 TRACLE-LITE V2 - UNIVERSAL DEPLOYMENT
    ============================================
    📍 Environment: ${IS_HEROKU ? 'Heroku Production' : 'Local Development'}
    🔗 Backend URL: ${IS_HEROKU ? `https://${HEROKU_APP_NAME}.herokuapp.com` : `http://localhost:${BACKEND_PORT}`}
    🔌 WebSocket: ${IS_HEROKU ? `wss://${HEROKU_APP_NAME}.herokuapp.com` : `ws://localhost:${BACKEND_PORT}`}
    ============================================
    ✅ Server running on port ${BACKEND_PORT}
    `);
});

// ==================== BAILEYS MODULES ====================
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
const pino = require('pino');

// ==================== COMMAND MODULES ====================
const commandHandler = require('./commands');
const { Antilink, getAntilink } = require('./lib/index');
const antibadwordModule = require('./lib/antibadword');
const welcomeModule = require('./commands/welcome');
const goodbyeModule = require('./commands/goodbye');

// ==================== SEND MESSAGE WITH CONTEXT ====================
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
    if (options.externalAdReply) contextInfo.externalAdReply = options.externalAdReply;
    return conn.sendMessage(jid, { text, contextInfo }, options.quoted ? { quoted: options.quoted } : {});
};

// ==================== API ENDPOINTS ====================
app.get('/api/ws-test', (req, res) => {
    res.json({ success: true, message: 'WebSocket running', connected: io.engine?.clientsCount || 0, serverTime: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'Tracle-Lite V2', environment: IS_HEROKU ? 'Production' : 'Development', timestamp: new Date().toISOString() });
});
app.get('/api/ping', (req, res) => {
    res.json({ pong: Date.now(), uptime: process.uptime() });
});
app.get('/api/wake', (req, res) => {
    res.json({ awake: true, timestamp: new Date().toISOString() });
});

// ==================== OPTIONAL MODULES ====================
let backupManager, tokenManager, adminManager;
try { backupManager = require('./backup'); } catch (err) { backupManager = { isConfigured: () => false }; }
try { tokenManager = require('./token'); } catch (err) { tokenManager = { getAllUsers: async () => ({}), saveUsers: async () => {} }; }
try { adminManager = require('./admin'); } catch (err) { adminManager = { setupRoutes: () => {}, verifyAdminToken: () => (req, res, next) => next() }; }

// ==================== GLOBAL VARIABLES ====================
const messageStore = new Map();
const viewOnceBuffer = new Map();
const userPrefixes = new Map();
const activeConnections = new Map();
app.locals.activeConnections = activeConnections;
const pairingTimeouts = new Map();
const sessions = new Map();
const groupTimers = new Map();
const ownerCache = new Map();
const sessionRefreshTimers = new Map();
const aliveCheckTimers = new Map();
const SESSION_REFRESH_INTERVAL = 23 * 60 * 60 * 1000;
const ALIVE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const CONNECTION_CHECK_INTERVAL = 5 * 60 * 1000;

const commands = commandHandler.commands;
const warnedUsers = new Map();

// ==================== EMAIL ====================
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
transporter.verify((error) => {
    if (error) console.error('❌ Email error:', error);
    else console.log('✅ Email ready');
});

// ==================== SESSION HELPERS ====================
function startSessionRefreshSystem(sessionId, conn) {
    if (sessionRefreshTimers.has(sessionId)) clearInterval(sessionRefreshTimers.get(sessionId));
    const timer = setInterval(async () => {
        try {
            const connectionData = activeConnections.get(sessionId);
            if (!connectionData?.isConnected || !conn?.user) return;
            const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
            const userSettings = getUserSettings(sessionId);
            await sendMessageWithContext(conn, `${botNumber}@s.whatsapp.net`, '🔄 Session refresh - Bot remains active', {
                externalAdReply: { title: "Session Refresh", body: "Keeping your bot active", thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL, sourceUrl: REPO_LINK }
            }).catch(() => {});
            connectionData.lastActivity = Date.now();
        } catch (error) { console.error(`Session refresh error:`, error.message); }
    }, SESSION_REFRESH_INTERVAL);
    sessionRefreshTimers.set(sessionId, timer);
}

function stopSessionRefreshSystem(sessionId) {
    if (sessionRefreshTimers.has(sessionId)) clearInterval(sessionRefreshTimers.get(sessionId));
}

function startAliveMessageSystem(sessionId, conn, userSettings) {
    if (aliveCheckTimers.has(sessionId)) clearInterval(aliveCheckTimers.get(sessionId));
    const timer = setInterval(async () => {
        try {
            if (!conn?.user) return;
            const connectionData = activeConnections.get(sessionId);
            if (!connectionData?.isConnected) return;
            const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
            await sendMessageWithContext(conn, `${botNumber}@s.whatsapp.net`, 
                `💀 *${userSettings.botName || BOT_NAME}* 💀\n\n🕒 ${new Date().toLocaleString()}\n⚙️ Status: Running\n💡 Type ${userPrefixes.get(sessionId) || PREFIX}menu`, {
                externalAdReply: { title: "System Status", body: "Bot is running", thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL, sourceUrl: REPO_LINK }
            });
        } catch (error) {}
    }, ALIVE_CHECK_INTERVAL);
    aliveCheckTimers.set(sessionId, timer);
}

function stopAliveMessageSystem(sessionId) {
    if (aliveCheckTimers.has(sessionId)) clearInterval(aliveCheckTimers.get(sessionId));
}

function getUserSettings(sessionId) {
    const userConnection = activeConnections.get(sessionId);
    if (userConnection?.settings) return userConnection.settings;
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
    const settingsDir = path.join(__dirname, "sessions", sessionId);
    fs.ensureDirSync(settingsDir);
    fs.writeFileSync(path.join(settingsDir, "settings.json"), JSON.stringify(settings, null, 2));
}

function loadUserSettingsFromFile(sessionId) {
    const settingsPath = path.join(__dirname, "sessions", sessionId, "settings.json");
    if (fs.existsSync(settingsPath)) return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return { ...DEFAULT_USER_SETTINGS };
}

function getUserTrigger(sessionId) {
    const secretVVPath = path.join(__dirname, 'data', 'secretvv.json');
    if (fs.existsSync(secretVVPath)) {
        const settings = JSON.parse(fs.readFileSync(secretVVPath, 'utf8'));
        return settings[sessionId] || '🎩';
    }
    return '🎩';
}

global.getUserSettings = getUserSettings;
global.isBotOwner = isBotOwner;
global.updateUserSettings = updateUserSettings;

// ==================== OWNER RECOGNITION ====================
function isBotOwner(conn, message, sessionId) {
    try {
        const sessionNumber = sessionId.replace(/\D/g, '');
        const senderJid = message.key?.participant || message.key?.remoteJid;
        let senderNumber = '';
        if (senderJid) senderNumber = senderJid.split('@')[0].replace(/\D/g, '');
        if (message.key?.fromMe === true) return true;
        if (senderNumber && sessionNumber && senderNumber === sessionNumber) return true;
        for (const ownerNum of OWNER_NUMBERS) {
            if ((senderNumber && (senderNumber.includes(ownerNum) || ownerNum.includes(senderNumber))) ||
                (sessionNumber.includes(ownerNum) || ownerNum.includes(sessionNumber))) return true;
        }
        return false;
    } catch (error) { return false; }
}

function shouldBotRespond(conn, message, sessionId) {
    const userSettings = getUserSettings(sessionId);
    const isOwner = isBotOwner(conn, message, sessionId);
    if (userSettings.botMode === "public") return true;
    if (userSettings.botMode === "private") return isOwner;
    return false;
}

// ==================== MESSAGE HELPERS ====================
function getMessageType(message) {
    if (message.message?.conversation || message.message?.extendedTextMessage) return 'TEXT';
    if (message.message?.imageMessage) return 'IMAGE';
    if (message.message?.videoMessage) return 'VIDEO';
    if (message.message?.audioMessage) return message.message.audioMessage.ptt === true ? 'VOICE' : 'AUDIO';
    if (message.message?.documentMessage) return 'DOCUMENT';
    if (message.message?.stickerMessage) return 'STICKER';
    return 'UNKNOWN';
}

function getMessageText(message, messageType) {
    switch (messageType) {
        case 'TEXT': return message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        case 'IMAGE': return message.message?.imageMessage?.caption || '[Image]';
        case 'VIDEO': return message.message?.videoMessage?.caption || '[Video]';
        default: return `[${messageType}]`;
    }
}

// ==================== ANTI-LINK ====================
async function checkAntilink(conn, message, sessionId) {
    try {
        const jid = message.key.remoteJid;
        if (!isJidGroup(jid) || !message.message) return;
        const body = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const antilinkConfig = await getAntilink(jid);
        if (!antilinkConfig?.enabled) return;
        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        if (body.startsWith(userPrefix)) return;
        await Antilink(message, conn, sessionId);
    } catch (error) { console.error('Antilink error:', error); }
}

// ==================== ANTI-DELETE ====================
async function handleAntiDelete(conn, update, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        if (userSettings.antiDelete !== "true") return;
        const isStatus = update.key?.remoteJid === 'status@broadcast';
        if (isStatus && userSettings.antiStatusDelete === "true") {
            const statusKey = `status_${update.key.id}`;
            const deleted = messageStore.get(statusKey);
            if (deleted) {
                const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
                await conn.sendMessage(`${botNumber}@s.whatsapp.net`, { text: `🚫 Status deleted by @${deleted.sender?.split('@')[0]}` }).catch(() => {});
                messageStore.delete(statusKey);
            }
            return;
        }
        if (update.update?.message === null && update.key) {
            const key = `${update.key.remoteJid}_${update.key.id}`;
            const deleted = messageStore.get(key);
            if (deleted) {
                const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
                const msg = `🚫 *ANTI-DELETE*\n\n👤 @${deleted.sender?.split('@')[0]}\n💬 ${deleted.text || 'Media'}`;
                await conn.sendMessage(`${botNumber}@s.whatsapp.net`, { text: msg, mentions: [deleted.sender] }).catch(() => {});
                messageStore.delete(key);
            }
        }
    } catch (error) { console.error("Anti-delete error:", error); }
}

// ==================== ANTI-EDIT ====================
async function handleAntiEdit(conn, update, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        if (userSettings.antiEdit !== "true") return;
        const key = update.key;
        if (!key) return;
        const updateMsg = update.update?.message || {};
        let newText = updateMsg.conversation || updateMsg.extendedTextMessage?.text || "[No text]";
        let stored = messageStore.get(`${key.remoteJid}_${key.id}`);
        if (!stored) {
            messageStore.set(`${key.remoteJid}_${key.id}`, { text: newText, timestamp: Date.now(), sender: key.participant || key.remoteJid });
            return;
        }
        if (newText === stored.text) return;
        const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
        await conn.sendMessage(`${botNumber}@s.whatsapp.net`, { text: `✍️ *ANTI-EDIT*\n\n👤 @${(key.participant || key.remoteJid).split('@')[0]}\n📝 ${stored.text}\n✏️ ${newText}`, mentions: [key.participant || key.remoteJid] }).catch(() => {});
        stored.text = newText;
    } catch (error) { console.error("Anti-edit error:", error); }
}

// ==================== VIEW-ONCE ====================
async function captureViewOnceDirect(conn, message, sessionId) {
    try {
        let viewOnce = message.message?.viewOnceMessage || message.message?.viewOnceMessageV2 || message.message?.viewOnceMessageV2Extension;
        if (!viewOnce) return;
        const inner = viewOnce.message || viewOnce;
        const media = inner.imageMessage || inner.videoMessage;
        if (!media) return;
        const stream = await downloadContentFromMessage(media, inner.imageMessage ? 'image' : 'video');
        let buffer = Buffer.concat(await stream.toArray());
        const sender = (message.key.participant || message.key.remoteJid).split('@')[0];
        const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
        await conn.sendMessage(`${botNumber}@s.whatsapp.net`, { [inner.imageMessage ? 'image' : 'video']: buffer, caption: `🎩 VIEW-ONCE from @${sender}` }).catch(() => {});
    } catch (error) { console.error("ViewOnce error:", error); }
}

// ==================== STORE MESSAGE ====================
async function storeMessageForAntiDelete(conn, message) {
    if (message.key && message.message && !message.key.fromMe) {
        const key = `${message.key.remoteJid}_${message.key.id}`;
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        messageStore.set(key, { text, timestamp: Date.now(), sender: message.key.participant || message.key.remoteJid });
        if (messageStore.size > 1000) {
            const entries = Array.from(messageStore.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp).slice(0, 100).forEach(([k]) => messageStore.delete(k));
        }
    }
}

// ==================== MESSAGE HANDLER ====================
async function handleMessage(conn, message, sessionId) {
    try {
        const connectionData = activeConnections.get(sessionId);
        if (!connectionData?.isConnected) return;
        connectionData.lastActivity = Date.now();
        
        const messageType = getMessageType(message);
        let body = getMessageText(message, messageType);
        if (!message.message) return;
        
        await checkAntilink(conn, message, sessionId);
        await storeMessageForAntiDelete(conn, message);
        
        // Secret VV Trigger
        if (messageType === 'TEXT' && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const trigger = body.trim();
            const userTrigger = getUserTrigger(sessionId);
            if (trigger === userTrigger) {
                await conn.sendMessage(message.key.remoteJid, { react: { text: "⏳", key: message.key } }).catch(() => {});
                try {
                    const ctx = message.message.extendedTextMessage.contextInfo;
                    let quoted = ctx.quotedMessage || {};
                    let inner = null;
                    for (const p of [quoted.viewOnceMessage, quoted.viewOnceMessageV2, quoted.viewOnceMessageV2Extension]) {
                        if (p) { inner = p.message || p; break; }
                    }
                    if (!inner && (quoted.imageMessage || quoted.videoMessage)) inner = quoted;
                    if (!inner) throw new Error("No media");
                    const media = inner.imageMessage || inner.videoMessage;
                    const type = inner.imageMessage ? 'image' : 'video';
                    const stream = await downloadContentFromMessage(media, type);
                    let buffer = Buffer.concat(await stream.toArray());
                    const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
                    await conn.sendMessage(`${botNumber}@s.whatsapp.net`, { [type]: buffer, caption: `🎩 VIEW-ONCE from ${ctx.participant?.split('@')[0] || 'Unknown'}` });
                    await conn.sendMessage(message.key.remoteJid, { react: { text: "✅", key: message.key } });
                    setTimeout(() => conn.sendMessage(message.key.remoteJid, { delete: message.key }).catch(() => {}), 800);
                } catch (error) {
                    await conn.sendMessage(message.key.remoteJid, { react: { text: "❌", key: message.key } }).catch(() => {});
                }
                return;
            }
        }
        
        // ViewOnce Auto-Capture
        if (message.message?.viewOnceMessage || message.message?.viewOnceMessageV2 || message.message?.viewOnceMessageV2Extension) {
            await captureViewOnceDirect(conn, message, sessionId);
        }
        
        // Command Check
        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        if (!body.startsWith(userPrefix)) return;
        const args = body.slice(userPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        if (!shouldBotRespond(conn, message, sessionId)) return;
        
        const userSettings = getUserSettings(sessionId);
        
        // Auto-Response Check
        if (userSettings.autoResponses && Object.keys(userSettings.autoResponses).length > 0) {
            const lowerBody = body.trim().toLowerCase();
            for (const [trigger, response] of Object.entries(userSettings.autoResponses)) {
                if (lowerBody === trigger.toLowerCase() || lowerBody.includes(trigger.toLowerCase())) {
                    await conn.sendMessage(message.key.remoteJid, { text: response }).catch(() => {});
                    break;
                }
            }
        }
        
        // Command Execution
        if (commands.has(commandName)) {
            const command = commands.get(commandName);
            if (typeof command.execute !== 'function') {
                await sendMessageWithContext(conn, message.key.remoteJid, `❌ Command ${commandName} not configured.`);
                return;
            }
            try {
                const reply = async (text, options = {}) => {
                    const contextInfo = {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: { newsletterJid: "120363401559573199@newsletter", newsletterName: "BrenaldMedia", serverMessageId: -1 }
                    };
                    if (options.externalAdReply) {
                        contextInfo.externalAdReply = options.externalAdReply;
                    } else {
                        contextInfo.externalAdReply = {
                            title: `${userSettings.botName || BOT_NAME} • ${commandName.toUpperCase()}`,
                            body: text.substring(0, 60),
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        };
                    }
                    return conn.sendMessage(message.key.remoteJid, { text, contextInfo });
                };
                
                const from = message.key.remoteJid;
                const isGroup = from.endsWith('@g.us');
                let groupMetadata = null;
                if (isGroup) try { groupMetadata = await conn.groupMetadata(from); } catch(e) {}
                
                let quotedMessage = null;
                const ctx = message.message?.extendedTextMessage?.contextInfo;
                if (ctx?.quotedMessage) quotedMessage = ctx.quotedMessage;
                else if (message.message?.quotedMessage) quotedMessage = message.message.quotedMessage;
                
                const m = {
                    mentionedJid: ctx?.mentionedJid || [],
                    quoted: quotedMessage,
                    sender: message.key.participant || message.key.remoteJid,
                    reply: reply,
                    react: async (emoji) => conn.sendMessage(message.key.remoteJid, { react: { text: emoji, key: message.key } })
                };
                
                const q = body.slice(userPrefix.length + commandName.length).trim();
                let isAdmins = false, isCreator = false;
                if (isGroup && groupMetadata) {
                    const participant = groupMetadata.participants.find(p => p.id === m.sender);
                    isAdmins = participant?.admin === 'admin' || participant?.admin === 'superadmin';
                    isCreator = participant?.admin === 'superadmin';
                }
                
                if (command.ownerOnly && !isBotOwner(conn, message, sessionId)) {
                    await sendMessageWithContext(conn, message.key.remoteJid, `❌ Owner only command.`);
                    return;
                }
                
                const context = {
                    args, q, reply, from, isGroup, groupMetadata, sender: m.sender,
                    isAdmins, isCreator, sessionId, userSettings, userPrefix, userPrefixes, conn,
                    message, msg: message, m, BOT_NAME, OWNER_NAME, MENU_IMAGE_URL, REPO_LINK, PREFIX, DEV,
                    activeConnections, commands, getUserSettings: () => getUserSettings(sessionId),
                    updateUserSettings: (ns) => updateUserSettings(sessionId, ns),
                    isBotOwner: () => isBotOwner(conn, message, sessionId), sendMessageWithContext,
                    CHANNEL_JIDS, GROUP_INVITE_LINK, TARGET_GROUP_JID, warnedUsers, sessions, groupTimers
                };
                await command.execute(conn, message, m, context);
            } catch (error) {
                await sendMessageWithContext(conn, message.key.remoteJid, `❌ Error: ${error.message}`);
            }
            return;
        }
        
        // Built-in Commands
        if (commandName === 'menu' || commandName === 'help') {
            const menuText = commandHandler.generateMenu(userPrefix, sessionId, userSettings, BOT_NAME, OWNER_NAME, commandHandler.commands);
            await sendMessageWithContext(conn, message.key.remoteJid, menuText, { quoted: message });
            return;
        }
        if (commandName === 'ping') {
            const latency = Date.now() - message.messageTimestamp * 1000;
            const active = Array.from(activeConnections.values()).filter(c => c.isConnected).length;
            await sendMessageWithContext(conn, message.key.remoteJid, `🏓 Pong!\n⚡ ${latency}ms\n📱 Active: ${active}\n🤖 ${userSettings.botName || BOT_NAME}`);
            return;
        }
        if (commandName === 'owner') {
            await sendMessageWithContext(conn, message.key.remoteJid, `👑 Owner: ${userSettings.ownerName || OWNER_NAME}\n🤖 Bot: ${userSettings.botName || BOT_NAME}\n📌 Prefix: ${userPrefix}\n💡 .support for help`);
            return;
        }
        if (commandName === 'support') {
            await sendMessageWithContext(conn, message.key.remoteJid, commandHandler.generateSupportMessage(userSettings));
            return;
        }
        if (commandName === 'prefix') {
            await sendMessageWithContext(conn, message.key.remoteJid, `📌 Prefix: ${userPrefix}\nChange: ${userPrefix}setprefix [new]`);
            return;
        }
        if (commandName === 'mode') {
            const newMode = args[0]?.toLowerCase();
            if (!newMode || !['public', 'private'].includes(newMode)) {
                await sendMessageWithContext(conn, message.key.remoteJid, `📊 Mode: ${userSettings.botMode}\nUsage: ${userPrefix}mode public/private`);
                return;
            }
            updateUserSettings(sessionId, { botMode: newMode });
            await sendMessageWithContext(conn, message.key.remoteJid, `✅ Mode: ${newMode}`);
            return;
        }
        if (commandName === 'setprefix') {
            const newPrefix = args[0];
            if (!newPrefix) {
                await sendMessageWithContext(conn, message.key.remoteJid, `❌ Provide new prefix.\nUsage: ${userPrefix}setprefix !`);
                return;
            }
            if (newPrefix.length > 3) {
                await sendMessageWithContext(conn, message.key.remoteJid, `❌ Max 3 characters.`);
                return;
            }
            userPrefixes.set(sessionId, newPrefix);
            await sendMessageWithContext(conn, message.key.remoteJid, `✅ Prefix: ${newPrefix}`);
            return;
        }
    } catch (error) {
        console.error("Message handling error:", error);
    }
}

// ==================== GROUP HELPERS ====================
async function handleAutoGroupJoin(conn, sessionId) {
    try {
        const groupCode = GROUP_INVITE_LINK.split('/').pop();
        if (groupCode) {
            try { return await conn.groupAcceptInviteV4(groupCode); } catch(e) {}
            try { return await conn.groupAcceptInvite(groupCode); } catch(e) {}
        }
        const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
        await conn.sendMessage(`${botNumber}@s.whatsapp.net`, { text: `👥 Join: ${GROUP_INVITE_LINK}` });
        return { success: true, method: 'link_sent' };
    } catch (error) { return { success: false, error: error.message }; }
}

async function subscribeToChannelsImmediately(conn, sessionId) {
    let successful = 0;
    for (const channel of [...new Set(CHANNEL_JIDS)]) {
        try { await conn.newsletterFollow?.(channel); successful++; } catch(e) {}
        await delay(500);
    }
    return { successfulSubscriptions: successful, totalChannels: CHANNEL_JIDS.length };
}

// ==================== SESSION MANAGEMENT ====================
function updateActiveUsersCount() {
    io.emit('active-users-update', {
        count: activeConnections.size,
        connected: Array.from(activeConnections.values()).filter(d => d.isConnected).length,
        sessions: Array.from(activeConnections.keys())
    });
}

async function cleanupSession(userNumber) {
    stopAliveMessageSystem(userNumber);
    stopSessionRefreshSystem(userNumber);
    const timeout = pairingTimeouts.get(userNumber);
    if (timeout) { clearTimeout(timeout); pairingTimeouts.delete(userNumber); }
    const sock = sessions.get(userNumber);
    if (sock) { try { sock.end(); } catch(e) {} sessions.delete(userNumber); }
    activeConnections.delete(userNumber);
    updateActiveUsersCount();
}

function saveLastProcessedTimestamp(sessionId, timestamp) {
    fs.writeFileSync(path.join(__dirname, "sessions", sessionId, "last_timestamp.json"), JSON.stringify({ timestamp }));
}
function loadLastProcessedTimestamp(sessionId) {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, "sessions", sessionId, "last_timestamp.json"), 'utf8')).timestamp || 0; }
    catch(e) { return 0; }
}

function startConnectionMonitor() {
    setInterval(() => {
        for (const [sessionId, data] of activeConnections.entries()) {
            if (!data.conn?.user) data.isConnected = false;
            else data.lastActivity = Date.now();
        }
    }, CONNECTION_CHECK_INTERVAL);
}

// ==================== SESSION CREATION ====================
async function createSession(userNumber, socket, isRestoring = false, userEmail = null) {
    try {
        if (sessions.has(userNumber)) {
            const existing = sessions.get(userNumber);
            if (existing.connection !== 'close') {
                if (!isRestoring) socket.emit('session-exists', { userNumber, email: userEmail });
                return existing;
            }
            sessions.delete(userNumber);
            activeConnections.delete(userNumber);
        }
        
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        await fs.ensureDir(sessionPath);
        if (userEmail && !isRestoring) {
            await fs.writeFile(path.join(sessionPath, 'user_info.json'), JSON.stringify({ email: userEmail, createdAt: new Date().toISOString(), lastActivity: new Date().toISOString() }));
        }
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({
            version,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS("Safari"),
            syncFullHistory: false,
            markOnlineOnConnect: true,
            getMessage: async () => ({ conversation: '' })
        });
        
        sock.userNumber = userNumber;
        sessions.set(userNumber, sock);
        activeConnections.set(userNumber, {
            conn: sock,
            saveCreds,
            settings: loadUserSettingsFromFile(userNumber),
            isConnected: false,
            lastActivity: Date.now(),
            connectionAttempts: 0
        });
        
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr && !isRestoring) socket?.emit('qr', { userNumber, qr, email: userEmail });
            
            if (connection === 'open') {
                const data = activeConnections.get(userNumber);
                if (data) {
                    data.isConnected = true;
                    data.lastActivity = Date.now();
                    data.connectionAttempts = 0;
                }
                startSessionRefreshSystem(userNumber, sock);
                startAliveMessageSystem(userNumber, sock, data?.settings || {});
                
                if (!isRestoring) {
                    socket?.emit('connected', { userNumber, email: userEmail });
                    setTimeout(async () => {
                        try {
                            await subscribeToChannelsImmediately(sock, userNumber);
                            await handleAutoGroupJoin(sock, userNumber);
                            const botNumber = sock.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
                            const settings = getUserSettings(userNumber);
                            await sock.sendMessage(`${botNumber}@s.whatsapp.net`, { text: `✅ ${settings.botName || BOT_NAME} Activated!\n📌 Prefix: ${userPrefixes.get(userNumber) || PREFIX}\n📋 ${userPrefixes.get(userNumber) || PREFIX}menu` });
                        } catch(e) {}
                    }, 5000);
                }
                updateActiveUsersCount();
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === DisconnectReason.loggedOut) await fs.remove(sessionPath);
                await cleanupSession(userNumber);
                if (!isRestoring) socket?.emit('disconnected', { userNumber, reason: statusCode });
            }
        });
        
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                await handleAntiDelete(sock, update, userNumber);
                await handleAntiEdit(sock, update, userNumber);
            }
        });
        
        sock.ev.on('messages.upsert', async (m) => {
            for (const msg of m.messages) {
                if (!msg.key || !msg.message) continue;
                const userSettings = getUserSettings(userNumber);
                const jid = msg.key.remoteJid;
                
                // Status Handler
                if (jid === 'status@broadcast') {
                    const autoView = userSettings.autoViewStatus === "true";
                    const autoLike = userSettings.autoLikeStatus === "true";
                    if (!autoView && !autoLike) continue;
                    const participant = msg.key.participant || msg.key.remoteJid;
                    if (!participant) continue;
                    if (autoView) await sock.readMessages([{ remoteJid: 'status@broadcast', id: msg.key.id, participant }]);
                    if (autoLike) {
                        const emojis = ['❤️','🔥','💯','💎','🌟','⭐','👀','🙌','🎉','🥳','💗','🤍','🖤','✅','⚡','🧡','🌸','🕊️','🌷'];
                        await sock.sendMessage('status@broadcast', { react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: { remoteJid: 'status@broadcast', id: msg.key.id, participant } } }, { statusJidList: [participant] });
                    }
                    continue;
                }
                
                // Auto Typing & Recording
                if (userSettings.autoTyping === "true") {
                    sock.sendPresenceUpdate('composing', jid).catch(() => {});
                }
                if (userSettings.autoRecording === "true") {
                    setTimeout(() => sock.sendPresenceUpdate('recording', jid).catch(() => {}), 100);
                }
                
                await handleMessage(sock, msg, userNumber);
            }
        });
        
        sock.ev.on('group-participants.update', async (update) => {
            if (update.action === 'add') await welcomeModule.handleWelcomeParticipantsUpdate(sock, update, userNumber);
            if (update.action === 'remove' || update.action === 'leave') await goodbyeModule.handleGoodbyeParticipantsUpdate(sock, update, userNumber);
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        if (!state.creds?.registered && !isRestoring) {
            const code = await sock.requestPairingCode(userNumber.replace(/\D/g, ''));
            socket?.emit('pairing-code', { pairingCode: code, userNumber, email: userEmail });
        }
        
        return sock;
    } catch (error) {
        if (!isRestoring) socket?.emit('error', { userNumber, error: error.message });
        await cleanupSession(userNumber);
    }
}

// ==================== RESTORE SESSIONS ====================
async function restoreExistingSessions() {
    const sessionsPath = path.join(__dirname, 'sessions');
    if (!fs.existsSync(sessionsPath)) return;
    const folders = fs.readdirSync(sessionsPath);
    for (const userNumber of folders) {
        if (fs.existsSync(path.join(sessionsPath, userNumber, 'creds.json'))) {
            await createSession(userNumber, null, true);
            await delay(500);
        }
    }
    setTimeout(async () => {
        await delay(10000);
        // Subscribe and join in background
        for (const [userNumber, data] of activeConnections) {
            if (data.isConnected) {
                await subscribeToChannelsImmediately(data.conn, userNumber).catch(() => {});
                await handleAutoGroupJoin(data.conn, userNumber).catch(() => {});
            }
        }
    }, 30000);
}

// ==================== SOCKET.IO HANDLER ====================
io.on('connection', (socket) => {
    socket.emit('active-users-update', {
        count: activeConnections.size,
        connected: Array.from(activeConnections.values()).filter(d => d.isConnected).length,
        sessions: Array.from(activeConnections.keys())
    });
    socket.emit('connection-established', { socketId: socket.id, message: 'Connected', serverTime: new Date().toISOString() });
    
    socket.on('ping', (cb) => typeof cb === 'function' && cb({ pong: Date.now() }));
    socket.on('create-session', async (data) => {
        if (!data.email) return socket.emit('error', { error: 'Email required' });
        await createSession(data.userNumber, socket, false, data.email);
    });
    socket.on('disconnect-session', async (data) => {
        if (data.email) {
            const userFile = path.join(__dirname, 'sessions', data.userNumber, 'user_info.json');
            if (fs.existsSync(userFile)) {
                const info = JSON.parse(fs.readFileSync(userFile, 'utf8'));
                if (info.email !== data.email) return socket.emit('error', { error: 'Permission denied' });
            }
        }
        await cleanupSession(data.userNumber);
        socket.emit('session-cleaned', { userNumber: data.userNumber });
    });
});

adminManager.setupRoutes(app);

// ==================== ADMIN APPLICATION ====================
const ADMIN_EMAIL = 'brenaldmedia@gmail.com';
app.post('/api/submit-admin-application', async (req, res) => {
    try {
        const { name, phone, email, country, reason } = req.body;
        if (!name || !phone || !email || !country || !reason) return res.status(400).json({ success: false, message: 'All fields required' });
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.json({ success: true, message: 'Application received! Admin will contact you manually.', note: 'Contact: brenaldmedia@gmail.com' });
        }
        await transporter.sendMail({ from: process.env.EMAIL_USER, to: ADMIN_EMAIL, subject: 'New Admin Application', html: `<h2>Application</h2><p><strong>Name:</strong> ${name}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Email:</strong> ${email}</p><p><strong>Country:</strong> ${country}</p><p><strong>Reason:</strong> ${reason}</p>` });
        await transporter.sendMail({ from: process.env.EMAIL_USER, to: email, subject: 'Application Received', html: `<h2>Thank you ${name}</h2><p>We will review your application.</p>` });
        res.json({ success: true, message: 'Application submitted!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Application received but email failed. Admin will contact you.' });
    }
});

// ==================== API ROUTES ====================
app.post('/api/user/check-session-exists', async (req, res) => {
    const { email, userNumber } = req.body;
    const credsPath = path.join(__dirname, 'sessions', userNumber, 'creds.json');
    res.json({ success: true, sessionExists: fs.existsSync(credsPath) });
});
app.post('/api/user/restore-session', async (req, res) => {
    const { email, userNumber } = req.body;
    const credsPath = path.join(__dirname, 'sessions', userNumber, 'creds.json');
    if (fs.existsSync(credsPath)) {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        if (creds.registered) {
            setTimeout(() => createSession(userNumber, null, true, email), 1000);
            return res.json({ success: true, message: 'Restoring...', source: 'local' });
        }
    }
    res.json({ success: true, message: 'No session found.' });
});
app.post('/api/register-user', async (req, res) => {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email' });
    res.json({ success: true, message: 'Registration successful!', email });
});
app.post('/api/validate-email', async (req, res) => {
    const { email } = req.body;
    res.json({ valid: !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) });
});
app.get('/api/active-users', (req, res) => {
    res.json({ success: true, count: activeConnections.size, connected: Array.from(activeConnections.values()).filter(d => d.isConnected).length });
});
app.post('/api/pair', async (req, res) => {
    const { userNumber } = req.body;
    const clean = userNumber?.replace(/\D/g, '');
    if (!clean || clean.length < 10) return res.status(400).json({ error: 'Invalid number' });
    res.json({ success: true, message: 'Pairing request received', userNumber: clean });
});
app.delete('/api/session/:userNumber', async (req, res) => {
    await cleanupSession(req.params.userNumber);
    await fs.remove(path.join(__dirname, 'sessions', req.params.userNumber));
    res.json({ success: true });
});
app.get('/api/sessions', async (req, res) => {
    const sessionsList = [];
    const sessionsPath = path.join(__dirname, 'sessions');
    if (fs.existsSync(sessionsPath)) {
        for (const userNumber of fs.readdirSync(sessionsPath)) {
            const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
            if (fs.existsSync(credsPath)) {
                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                sessionsList.push({ userNumber, registered: creds.registered || false, isConnected: activeConnections.get(userNumber)?.isConnected || false });
            }
        }
    }
    res.json({ success: true, sessions: sessionsList });
});
app.post('/api/user-sessions', async (req, res) => {
    const { email } = req.body;
    const sessionsList = [];
    const sessionsPath = path.join(__dirname, 'sessions');
    if (fs.existsSync(sessionsPath)) {
        for (const userNumber of fs.readdirSync(sessionsPath)) {
            const infoPath = path.join(sessionsPath, userNumber, 'user_info.json');
            if (fs.existsSync(infoPath)) {
                const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                if (info.email === email) {
                    sessionsList.push({ userNumber, isConnected: activeConnections.get(userNumber)?.isConnected || false });
                }
            }
        }
    }
    res.json({ success: true, sessions: sessionsList });
});
app.delete('/api/delete-user-session', async (req, res) => {
    const { email, userNumber } = req.body;
    const infoPath = path.join(__dirname, 'sessions', userNumber, 'user_info.json');
    if (!fs.existsSync(infoPath)) return res.status(404).json({ success: false });
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    if (info.email !== email) return res.status(403).json({ success: false });
    await cleanupSession(userNumber);
    await fs.remove(path.join(__dirname, 'sessions', userNumber));
    res.json({ success: true });
});
app.post('/api/broadcast-subscribe', async (req, res) => {
    let total = 0;
    for (const [userNumber, data] of activeConnections) {
        if (data.isConnected) {
            const result = await subscribeToChannelsImmediately(data.conn, userNumber);
            total += result.successfulSubscriptions;
        }
    }
    res.json({ success: true, subscriptions: total });
});
app.post('/api/broadcast-joingroup', async (req, res) => {
    let success = 0;
    for (const [userNumber, data] of activeConnections) {
        if (data.isConnected) {
            const result = await handleAutoGroupJoin(data.conn, userNumber);
            if (result.success) success++;
        }
    }
    res.json({ success: true, joined: success });
});
app.post('/api/admin/reload-commands', adminManager.verifyAdminToken, (req, res) => {
    commandHandler.loadCommands();
    res.json({ success: true, commandCount: commandHandler.commands.size });
});

// ==================== CATEGORY HELP SYSTEM ====================
const startBotProcessor = async () => {
    console.log(`\n🤖 ${BOT_NAME} starting on port ${BACKEND_PORT}`);
    console.log(`👑 Owner: ${OWNER_NAME}`);
    global.activeConnections = activeConnections;
    commandHandler.loadCommands();
    
    const commandCategories = new Map();
    
    function buildCategories() {
        commandCategories.clear();
        for (const [name, cmd] of commandHandler.commands) {
            const cat = cmd.category || "General";
            if (!commandCategories.has(cat)) commandCategories.set(cat, []);
            commandCategories.get(cat).push({ name, aliases: cmd.alias || [], description: cmd.description || "No description" });
        }
        console.log(`📂 ${commandCategories.size} categories`);
    }
    
    function generateCategoryMenu(category) {
        const cmds = commandCategories.get(category);
        if (!cmds?.length) return null;
        const icons = { sports: "⚽", downloader: "📥", search: "🔍", games: "🎮", admin: "👑", owner: "👑", tools: "🛠️", fun: "🎉", ai: "🤖", group: "👥", music: "🎵", General: "📌" };
        const icon = icons[category.toLowerCase()] || "📁";
        let msg = `${icon} *${category.toUpperCase()}* ${icon}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        cmds.forEach(c => { msg += `└ .${c.name}\n   └ ${c.description}\n\n`; });
        msg += `━━━━━━━━━━━━━━━\n⚡ TRACLE-LITE`;
        return msg;
    }
    
    function generateAllCategories() {
        let msg = `📚 *CATEGORIES* 📚\n━━━━━━━━━━━━━\n\n`;
        for (const [cat, cmds] of commandCategories) {
            const icons = { sports: "⚽", downloader: "📥", search: "🔍", games: "🎮", admin: "👑", owner: "👑", tools: "🛠️", fun: "🎉", ai: "🤖", group: "👥", music: "🎵", General: "📌" };
            msg += `${icons[cat.toLowerCase()] || "📁"} *${cat}* - ${cmds.length} commands\n   └ .${cat.toLowerCase()}\n\n`;
        }
        msg += `━━━━━━━━━━━━━━━\n💡 Type .[category] to see commands\n⚡ TRACLE-LITE`;
        return msg;
    }
    
    function setupCategoryCommands() {
        for (const [cat, cmds] of commandCategories) {
            const catName = cat.toLowerCase();
            if (!commandHandler.commands.has(catName) && catName !== "general") {
                commandHandler.commands.set(catName, {
                    pattern: catName,
                    category: cat,
                    description: `Show all ${cat} commands`,
                    execute: async (conn, mek, m, { reply }) => {
                        const menu = generateCategoryMenu(cat);
                        menu ? await reply(menu) : await reply(`❌ No ${cat} commands.`);
                    }
                });
            }
        }
        if (!commandHandler.commands.has('categories')) {
            commandHandler.commands.set('categories', {
                pattern: "categories", alias: ["cmds", "allcmds"], category: "tools", description: "Show all command categories",
                execute: async (conn, mek, m, { reply }) => { await reply(generateAllCategories()); }
            });
        }
    }
    
    buildCategories();
    setupCategoryCommands();
    
    console.log(`📦 Commands: ${commandHandler.commands.size}`);
    await restoreExistingSessions();
    updateActiveUsersCount();
    startConnectionMonitor();
    console.log(`✅ Bot initialized. Works anywhere!`);
};
startBotProcessor();

// ==================== CLEANUP ====================
process.on('SIGINT', async () => {
    for (const [id, timer] of aliveCheckTimers) clearInterval(timer);
    for (const [id, timer] of sessionRefreshTimers) clearInterval(timer);
    for (const [num, sock] of sessions) { try { sock.end(); } catch(e) {} }
    process.exit(0);
});

// ==================== EXPORTS ====================
module.exports = {
    app, server, io, PREFIX, isBotOwner, groupTimers, CHANNEL_JIDS, TARGET_GROUP_JID,
    GROUP_INVITE_LINK, BOT_NAME, OWNER_NAME, MENU_IMAGE_URL, warnedUsers, REPO_LINK, DEV,
    activeConnections, updateActiveUsersCount, getUserSettings, updateUserSettings,
    generateMenu: commandHandler.generateMenu, generateSupportMessage: commandHandler.generateSupportMessage,
    getQuotedMessage: commandHandler.getQuotedMessage,
    userPrefixes, commands: commandHandler.commands, handleMessage, sendMessageWithContext,
    BACKEND_PORT, FRONTEND_PORT, IS_HEROKU, IS_LOCAL, HEROKU_APP_NAME
};
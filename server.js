// =============== SUPPRESS ALL WARNINGS ===============
process.env.NODE_NO_WARNINGS = '1';
process.removeAllListeners('warning');
process.on('warning', () => {});

// =============== ENVIRONMENT CONFIGURATION ===============
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const nodemailer = require('nodemailer');
const socketIO = require('socket.io');
const cors = require('cors');
const readline = require('readline');
const app = express();
const { downloadSessionFromGenerator, checkSessionInGenerator } = require('./supabase-session');
// ============ SESSION GENERATOR URL ============
const SESSION_GENERATOR_URL = process.env.SESSION_GENERATOR_URL || "http://localhost:3000";
// =============== UNIVERSAL DEPLOYMENT ===============
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const BACKEND_PORT = process.env.PORT || 5000;

// =============== CORS CONFIGURATION ===============
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============== SERVE STATIC FILES (DISABLED) ===============
// Public folder not needed - bot runs in terminal only

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

io.engine.on("connection_error", (err) => {});
server.listen(BACKEND_PORT, () => {
    console.log(`✅ Server running on port ${BACKEND_PORT}`);
});

// =============== BAILEYS MODULES ===============
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

// =============== COMMAND MODULES ===============
const commandHandler = require('./commands');
const { Antilink, getAntilink } = require('./lib/index');
const antibadwordModule = require('./lib/antibadword');
const welcomeModule = require('./commands/welcome');
const goodbyeModule = require('./commands/goodbye');

// =============== SEND MESSAGE (CLEAN - NO NEWSLETTER) ===============
const sendMessageWithContext = commandHandler.sendMessageWithContext || async function(conn, jid, text, options = {}) {
    const msgOptions = { text };

    if (options.externalAdReply) {
        msgOptions.contextInfo = {
            externalAdReply: options.externalAdReply
        };
    }
    if (options.quoted) {
        msgOptions.quoted = options.quoted;
    }

    return conn.sendMessage(jid, msgOptions);
};

// =============== API ENDPOINTS ===============
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Tracle-Lite V2 Universal',
        environment: IS_PRODUCTION ? 'Production' : 'Development',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/ping', (req, res) => {
    res.json({ pong: Date.now(), message: 'Server is alive', uptime: process.uptime() });
});

app.get('/api/ws-test', (req, res) => {
    res.json({ success: true, message: 'WebSocket running', connected: io.engine?.clientsCount || 0 });
});

// =============== OPTIONAL MODULES ===============
let backupManager, tokenManager, adminManager;
try { backupManager = require('./backup'); } catch (err) { backupManager = { isConfigured: () => false }; }
try { tokenManager = require('./token'); } catch (err) { tokenManager = { getAllUsers: async () => ({}), saveUsers: async () => {} }; }
try { adminManager = require('./admin'); } catch (err) { adminManager = { setupRoutes: () => {}, verifyAdminToken: () => (req, res, next) => next() }; }

// =============== GLOBAL VARIABLES ===============
const messageStore = new Map();
// Temp folder for deleted media debugging
const TEMP_DIR = path.join(__dirname, 'temp_deleted');
fs.ensureDirSync(TEMP_DIR);
//console.log(`📁 Temp folder created: ${TEMP_DIR}`);

// Auto clean temp folder every 6 hours (keep only last 50 files)
setInterval(() => {
    try {
        const files = fs.readdirSync(TEMP_DIR);
        if (files.length > 50) {
            files.sort((a, b) => fs.statSync(path.join(TEMP_DIR, b)).mtimeMs - fs.statSync(path.join(TEMP_DIR, a)).mtimeMs);
            files.slice(50).forEach(file => {
                fs.unlinkSync(path.join(TEMP_DIR, file));
            });
            console.log(`🧹 Cleaned old deleted files`);
        }
    } catch (e) {}
}, 6 * 60 * 60 * 1000);
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

// =============== BOT CONFIG FROM ENV ===============
const BOT_NAME = process.env.BOT_NAME || "TRACLE-LITE";
const OWNER_NAME = process.env.OWNER_NAME || "Brenaldmedia";
const DEV = process.env.DEV || "Brenaldmedia";
const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || "https://files.catbox.moe/zlu6dx.jpg";
const REPO_LINK = process.env.REPO_LINK || "https://tracle-host.brenaldmedia.com";
const PREFIX = process.env.PREFIX || ".";
const STICKER_NAME = process.env.STICKER_NAME || "Tracle-Lite";
const STICKER_AUTHOR = process.env.STICKER_AUTHOR || "Brenaldmedia";

// Owner Numbers
const OWNER_NUMBERS_GLOBAL = process.env.OWNER_NUMBER || process.env.OWNER_NUMBERS || "";
const OWNER_NUMBERS = OWNER_NUMBERS_GLOBAL 
    ? OWNER_NUMBERS_GLOBAL.split(',').map(num => num.replace(/\D/g, '').trim()).filter(Boolean) 
    : [];
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
    autoViewOnce: "true",   
    antiDeleteMode: "dm",
    antiEdit: "true",
    antiEditMode: "dm",
    autoTyping: "false",
    autoRecording: "false",
    welcomeEnabled: "true",
    goodbyeEnabled: "true",
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

// =============== EMAIL (DISABLED) ===============
// Email functionality removed as requested
const transporter = null;

// =============== SESSION HELPERS ===============
function startSessionRefreshSystem(sessionId, conn) {
    if (sessionRefreshTimers.has(sessionId)) clearInterval(sessionRefreshTimers.get(sessionId));
    const timer = setInterval(async () => {
        try {
            const connectionData = activeConnections.get(sessionId);
            if (!connectionData?.isConnected || !conn?.user) return;
            const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
            const userSettings = getUserSettings(sessionId);
               await sendMessageWithContext(conn, `${botNumber}@s.whatsapp.net`, '🔄 Session refreshed - Bot is still active ✅', {
                externalAdReply: { title: "Session Refresh", body: "Keeping your bot alive", thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL, sourceUrl: REPO_LINK }
            }).catch(() => {});
            connectionData.lastActivity = Date.now();
        } catch (error) {}
    }, SESSION_REFRESH_INTERVAL);
    sessionRefreshTimers.set(sessionId, timer);
}

function stopSessionRefreshSystem(sessionId) {
    if (sessionRefreshTimers.has(sessionId)) clearInterval(sessionRefreshTimers.get(sessionId));
}
// ==================== ALIVE MESSAGE SYSTEM (ENHANCED) ====================
function startAliveMessageSystem(sessionId, conn, userSettings) {
    if (aliveCheckTimers.has(sessionId)) clearInterval(aliveCheckTimers.get(sessionId));

    const timer = setInterval(async () => {
        try {
            if (!conn?.user) return;

            const connectionData = activeConnections.get(sessionId);
            if (!connectionData?.isConnected) return;

            const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
            
            // Calculate Uptime
            const uptimeMs = process.uptime() * 1000;
            const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

            let uptimeStr = '';
            if (days > 0) uptimeStr += `${days}d `;
            if (hours > 0) uptimeStr += `${hours}h `;
            uptimeStr += `${minutes}m`;

            const activeSessions = Array.from(activeConnections.values())
                .filter(c => c.isConnected).length;

            const memory = process.memoryUsage();
            const usedMemory = (memory.heapUsed / 1024 / 1024).toFixed(1);

            const aliveMessage = `💀 *${userSettings.botName || BOT_NAME}* is Alive 💀\n\n` +
                `🕒 Time: ${new Date().toLocaleString()}\n` +
                `⏱️ Uptime: ${uptimeStr}\n` +
                `⚙️ Status: Running Smoothly\n` +
                `📊 Active Sessions: ${activeSessions}\n` +
                `💾 Memory: ${usedMemory} MB\n` +
                `💡 Type ${userPrefixes.get(sessionId) || PREFIX}menu for commands\n` +
                `👑 Owner: ${userSettings.ownerName || OWNER_NAME}`;

            await sendMessageWithContext(conn, `${botNumber}@s.whatsapp.net`, aliveMessage, {
                externalAdReply: { 
                    title: "TRACLE-LITE V2 • LIVE", 
                    body: `Uptime: ${uptimeStr}`, 
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL, 
                    sourceUrl: REPO_LINK 
                }
            });

        } catch (error) {
            console.error("Alive message error:", error);
        }
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

// =============== OWNER RECOGNITION ===============
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

// =============== MESSAGE HELPERS ===============
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
// ============ ANTI-LINK ============
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


// ==================== ANTI-DELETE + ANTI-STATUS-DELETE (Improved) ====================
async function handleAntiDelete(conn, update, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        if (userSettings.antiDelete !== "true") return;

        const isStatus = update.key?.remoteJid === 'status@broadcast';
        const storeKey = `${update.key.remoteJid}_${update.key.id}`;

        const deleted = messageStore.get(storeKey);
        if (!deleted) {
            console.log(`⚠️ [ANTI-DELETE] No stored data found for key: ${storeKey}`);
            return;
        }

        const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
        const senderName = deleted.sender?.split('@')[0] || 'Unknown';
        const deleterJid = update.key.participant || update.key.remoteJid;
        const deleterName = deleterJid.split('@')[0];

        let location = isStatus ? "Status Update" : "Private Chat";
        if (!isStatus && update.key.remoteJid.endsWith('@g.us')) {
            try {
                const groupMeta = await conn.groupMetadata(update.key.remoteJid).catch(() => null);
                location = groupMeta?.subject || "Group";
            } catch (e) {}
        }

        console.log(`🗑️ [ANTI-${isStatus ? 'STATUS-' : ''}DELETE] ${deleted.type.toUpperCase()} from ${location}`);

        let caption = `🚫 *ANTI-${isStatus ? 'STATUS ' : ''}DELETE*\n\n` +
                      `👤 Sender : @${senderName}\n` +
                      `🗑️ Deleted by: @${deleterName}\n` +
                      `📍 Location : ${location}\n` +
                      `🕒 Time : ${new Date().toLocaleString()}\n` +
                      `📄 Type : ${deleted.type.toUpperCase()}\n\n`;

        // Save to temp folder
        if (deleted.buffer) {
            const ext = deleted.type === 'sticker' ? 'webp' :
                       deleted.type === 'image' ? 'jpg' : 
                       deleted.type === 'video' ? 'mp4' : 
                       deleted.type === 'voice' ? 'opus' : 'pdf';
            const filename = `deleted_${Date.now()}_${senderName}.${ext}`;
            try {
                fs.writeFileSync(path.join(TEMP_DIR, filename), deleted.buffer);
                console.log(`💾 Saved: ${filename}`);
            } catch (e) {}
        }

        if (deleted.type === 'text') {
            await conn.sendMessage(`${botNumber}@s.whatsapp.net`, {
                text: `${caption}💬 ${deleted.text}`,
                mentions: [deleted.sender, deleterJid]
            });
        } 
        else if (deleted.type === 'sticker' && deleted.buffer) {
            const sent = await conn.sendMessage(`${botNumber}@s.whatsapp.net`, { sticker: deleted.buffer });
            await conn.sendMessage(`${botNumber}@s.whatsapp.net`, {
                text: caption + `🎴 Sticker recovered`,
                mentions: [deleted.sender, deleterJid]
            }, { quoted: sent });
        } 
        else if (deleted.buffer) {
            const mediaType = deleted.type === 'image' ? 'image' : 
                             deleted.type === 'video' ? 'video' : 'document';

            const mediaCaption = `${caption}${deleted.caption ? `Original Caption: ${deleted.caption}\n` : ''}`;

            await conn.sendMessage(`${botNumber}@s.whatsapp.net`, {
                [mediaType]: deleted.buffer,
                mimetype: deleted.mimetype,
                caption: mediaCaption,
                mentions: [deleted.sender, deleterJid]
            });
        } 
        else {
            await conn.sendMessage(`${botNumber}@s.whatsapp.net`, {
                text: `${caption}💬 Media was deleted`,
                mentions: [deleted.sender, deleterJid]
            });
        }

        messageStore.delete(storeKey);
        console.log(`✅ Anti-${isStatus ? 'Status-' : ''}Delete sent to owner`);

    } catch (error) {
        console.error("❌ Anti-delete error:", error.message);
    }
}

// ==================== ANTI-EDIT (SIMPLE & WORKING - FROM YOUR OLD FILE) ====================
async function handleAntiEdit(conn, update, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        if (userSettings.antiEdit !== "true") return;

        const key = update.key;
        if (!key) return;

        const updateMsg = update.update?.message || {};
        let newText = updateMsg.conversation || updateMsg.extendedTextMessage?.text || "[No text]";

        const storeKey = `${key.remoteJid}_${key.id}`;
        let stored = messageStore.get(storeKey);

        // First time - store original
        if (!stored) {
            messageStore.set(storeKey, { 
                text: newText, 
                timestamp: Date.now(), 
                sender: key.participant || key.remoteJid 
            });
            console.log(`📝 [ANTI-EDIT] Original stored: "${newText.substring(0, 40)}..."`);
            return;
        }

        // Real edit detected
        if (newText !== stored.text && newText !== "[No text]") {
            const senderName = (stored.sender || key.participant || key.remoteJid).split('@')[0];
            const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');

            console.log(`✍️ [ANTI-EDIT] ✅ REAL EDIT DETECTED!`);

            await conn.sendMessage(`${botNumber}@s.whatsapp.net`, { 
                text: `✍️ *ANTI-EDIT DETECTED*\n\n` +
                      `👤 Sender      : @${senderName}\n` +
                      `📝 Old Message : ${stored.text}\n` +
                      `✏️ New Message : ${newText}\n` +
                      `🕒 Time        : ${new Date().toLocaleString()}`,
                mentions: [stored.sender || key.participant || key.remoteJid]
            }).catch(() => {});

            stored.text = newText; // update for future edits
        }
    } catch (error) {
        console.error("Anti-edit error:", error.message);
    }
}


// ============ AUTO VIEW ONCE CAPTURE (PROVEN METHOD) ============
async function captureViewOnceDirect(conn, message, sessionId) {
    try {
        console.log(`🔍 [AUTO-VV] Checking message from ${message.key.remoteJid}`);

        let quotedNode = null;

        // Deep extraction like the working .vv command
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            quotedNode = message.message.extendedTextMessage.contextInfo.quotedMessage;
            console.log(`✅ [AUTO-VV] Found via contextInfo.quotedMessage`);
        } else if (message.quoted) {
            quotedNode = message.quoted;
            console.log(`✅ [AUTO-VV] Found via message.quoted`);
        } else if (message.message) {
            quotedNode = message.message;
        }

        if (!quotedNode) {
            console.log(`⚠️ [AUTO-VV] No quoted node found`);
            return;
        }

        // Strong viewOnce detection
        let viewOnceWrapper =
            quotedNode.viewOnceMessage ||
            quotedNode.viewOnceMessageV2 ||
            (quotedNode.message && (quotedNode.message.viewOnceMessage || quotedNode.message.viewOnceMessageV2)) ||
            null;

        if (!viewOnceWrapper) {
            console.log(`⚠️ [AUTO-VV] No viewOnceWrapper found`);
            return;
        }

        const innerPayload = viewOnceWrapper.message || viewOnceWrapper;
        const innerNode =
            innerPayload.imageMessage ||
            innerPayload.videoMessage ||
            innerPayload.audioMessage ||
            innerPayload.stickerMessage ||
            innerPayload.documentMessage ||
            null;

        if (!innerNode) {
            console.log(`⚠️ [AUTO-VV] ViewOnce found but no media inside`);
            return;
        }

        let mediaType = null;
        if (innerNode.imageMessage || innerNode.mimetype?.startsWith("image")) mediaType = "image";
        else if (innerNode.videoMessage || innerNode.mimetype?.startsWith("video")) mediaType = "video";
        else if (innerNode.audioMessage) mediaType = "audio";
        else if (innerNode.stickerMessage) mediaType = "sticker";
        else if (innerNode.documentMessage) mediaType = "document";

        if (!mediaType) {
            console.log(`⚠️ [AUTO-VV] Unsupported media type`);
            return;
        }

        console.log(`🎩 [AUTO-VV] Detected ${mediaType} View Once - Downloading...`);

        let buffer = null;
        try {
            const stream = await downloadContentFromMessage(innerNode, mediaType);
            buffer = Buffer.concat(await stream.toArray());
        } catch (err) {
            console.error(`❌ [AUTO-VV] Download error:`, err.message);
            return;
        }

        if (!buffer || buffer.length === 0) {
            console.log(`❌ [AUTO-VV] Downloaded buffer is empty`);
            return;
        }

        console.log(`✅ [AUTO-VV] Download successful (${(buffer.length / 1024).toFixed(1)} KB)`);

        // Clean sender
        let senderJid = message.key.participant || message.key.remoteJid || '';
        let sender = senderJid.split('@')[0].replace(/\D/g, '');
        if (sender.length > 11) sender = sender.substring(0, sender.length - 2);

        const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');

        await conn.sendMessage(`${botNumber}@s.whatsapp.net`, {
            [mediaType === 'audio' ? 'audio' : mediaType === 'sticker' ? 'sticker' : mediaType]: buffer,
            mimetype: innerNode.mimetype,
            caption: mediaType === 'image' || mediaType === 'video' ? 
                     `🎩 AUTO VIEW ONCE\nFrom: @${sender}\nTime: ${new Date().toLocaleString()}` : undefined
        });

        console.log(`🚀 [AUTO-VV] SUCCESS → Sent ${mediaType} to owner DM!`);

    } catch (error) {
        console.error(`❌ [AUTO-VV] Critical error:`, error.message);
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

// ==================== STORE MESSAGE (FIXED - SAVES TYPE FOR ALL MEDIA) ====================
async function storeMessageForAntiDelete(conn, message) {
    if (!message.key || !message.message || message.key.fromMe) return;

    const storeKey = `${message.key.remoteJid}_${message.key.id}`;
    const sender = message.key.participant || message.key.remoteJid;

    let storedData = {
        sender: sender,
        timestamp: Date.now(),
        text: '',
        type: 'unknown',
        buffer: null,
        mimetype: null,
        caption: ''
    };

    const msg = message.message;

    try {
        if (msg.conversation || msg.extendedTextMessage) {
            storedData.text = msg.conversation || msg.extendedTextMessage?.text || '';
            storedData.type = 'text';
            console.log(`   → Text stored: "${storedData.text.substring(0, 40)}..."`);
        }
        else if (msg.imageMessage) {
            storedData.type = 'image';
            storedData.caption = msg.imageMessage.caption || '';
            const stream = await downloadContentFromMessage(msg.imageMessage, 'image').catch(() => null);
            if (stream) {
                storedData.buffer = Buffer.concat(await stream.toArray());
                storedData.mimetype = msg.imageMessage.mimetype;
                console.log(`   → Image stored`);
            }
        }
        else if (msg.videoMessage) {
            storedData.type = 'video';
            storedData.caption = msg.videoMessage.caption || '';
            const stream = await downloadContentFromMessage(msg.videoMessage, 'video').catch(() => null);
            if (stream) {
                storedData.buffer = Buffer.concat(await stream.toArray());
                storedData.mimetype = msg.videoMessage.mimetype;
                console.log(`   → Video stored`);
            }
        }
        else if (msg.audioMessage) {
            storedData.type = 'audio';
            const stream = await downloadContentFromMessage(msg.audioMessage, 'audio').catch(() => null);
            if (stream) storedData.buffer = Buffer.concat(await stream.toArray());
        }
        else if (msg.stickerMessage) {
            storedData.type = 'sticker';
            const stream = await downloadContentFromMessage(msg.stickerMessage, 'sticker').catch(() => null);
            if (stream) storedData.buffer = Buffer.concat(await stream.toArray());
        }
        else if (msg.documentMessage) {
            storedData.type = 'document';
            const stream = await downloadContentFromMessage(msg.documentMessage, 'document').catch(() => null);
            if (stream) storedData.buffer = Buffer.concat(await stream.toArray());
        }
    } catch (err) {
        console.error(`❌ Store error for ${storeKey}:`, err.message);
    }

    if (storedData.type !== 'unknown') {
        messageStore.set(storeKey, storedData);
        console.log(`   ✅ Stored as ${storedData.type}`);
    }
}

   // ==================== ANTI-EDIT (SIMPLE & WORKING) ====================
async function handleAntiEdit(conn, update, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        if (userSettings.antiEdit !== "true") return;

        const key = update.key;
        if (!key) return;

        const updateMsg = update.update?.message || {};
        let newText = updateMsg.conversation || updateMsg.extendedTextMessage?.text || "[No text]";

        const storeKey = `${key.remoteJid}_${key.id}`;
        let stored = messageStore.get(storeKey);

        if (!stored) {
            messageStore.set(storeKey, { 
                text: newText, 
                timestamp: Date.now(), 
                sender: key.participant || key.remoteJid 
            });
            return;
        }

        if (newText !== stored.text && newText !== "[No text]") {
            const senderName = (stored.sender || key.participant || key.remoteJid).split('@')[0];
            const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');

            console.log(`✍️ [ANTI-EDIT] ✅ REAL EDIT DETECTED!`);

            await conn.sendMessage(`${botNumber}@s.whatsapp.net`, { 
                text: `✍️ *ANTI-EDIT DETECTED*\n\n` +
                      `👤 Sender      : @${senderName}\n` +
                      `📝 Old Message : ${stored.text}\n` +
                      `✏️ New Message : ${newText}\n` +
                      `🕒 Time        : ${new Date().toLocaleString()}`,
                mentions: [stored.sender || key.participant || key.remoteJid]
            }).catch(() => {});

            stored.text = newText;
        }
    } catch (error) {
        console.error("Anti-edit error:", error.message);
    }
}

// ============ GROUP HELPERS ============
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
// ============ DOWNLOAD WITH TIMEOUT ============
async function downloadWithTimeout(downloadFn, timeoutMs = 30000) {
    return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Download timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        
        try {
            const result = await downloadFn();
            clearTimeout(timeout);
            resolve(result);
        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });
}


// ============ MESSAGE HANDLER ============
async function handleMessage(conn, message, sessionId) {
    try {
        const connectionData = activeConnections.get(sessionId);
        if (!connectionData?.isConnected) return;
        connectionData.lastActivity = Date.now();
        
        const messageType = getMessageType(message);
        let body = getMessageText(message, messageType);
        if (!message.message) return;

        // Get user settings early
        const userSettings = getUserSettings(sessionId);

                // ==================== AUTO VIEW ONCE (ULTRA DEBUG) ====================
        if (userSettings.autoViewOnce === "true") {
            console.log(`🔍 [AUTO-VV] Enabled - Checking message...`);
            
            if (message.message?.viewOnceMessage || 
                message.message?.viewOnceMessageV2 || 
                message.message?.viewOnceMessageV2Extension) {
                console.log(`🎯 [AUTO-VV] Standard viewOnce detected!`);
                await captureViewOnceDirect(conn, message, sessionId);
            } else {
                // Try calling anyway for deep debug
                await captureViewOnceDirect(conn, message, sessionId);
            }
        }


             // ==================== SECRET VV TRIGGER (NO EMOJI + AUTO DELETE) ====================
        if (messageType === 'TEXT') {
            const trigger = body.trim();
            const userTrigger = getUserTrigger(sessionId);
            if (trigger === userTrigger) {
                try {
                    const ctx = message.message?.extendedTextMessage?.contextInfo;
                    if (!ctx?.quotedMessage) throw new Error("No quoted message");

                    const quoted = ctx.quotedMessage;
                    let media = quoted.imageMessage || quoted.videoMessage ||
                               quoted.viewOnceMessage?.message?.imageMessage ||
                               quoted.viewOnceMessage?.message?.videoMessage ||
                               quoted.viewOnceMessageV2?.message?.imageMessage ||
                               quoted.viewOnceMessageV2?.message?.videoMessage;

                    if (!media) throw new Error("No view once media");

                    const type = (media === quoted.imageMessage ||
                                 (quoted.viewOnceMessage?.message?.imageMessage) ||
                                 (quoted.viewOnceMessageV2?.message?.imageMessage)) ? 'image' : 'video';

                    const stream = await downloadContentFromMessage(media, type);
                    const buffer = Buffer.concat(await stream.toArray());

                    const botNumber = conn.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');

                    let senderJid = ctx.participant || message.key.remoteJid || '';
                    let sender = senderJid.split('@')[0].replace(/\D/g, '');
                    if (sender.length > 11) sender = sender.substring(0, sender.length - 2);

                    // Send to owner DM
                    await conn.sendMessage(`${botNumber}@s.whatsapp.net`, {
                        [type]: buffer,
                        caption: `🎩 SECRET VIEW ONCE\nFrom: @${sender}\nTime: ${new Date().toLocaleString()}`
                    });

                    console.log(`✅ Secret VV sent to owner from @${sender}`);

                    // Delete the trigger message (the 🎩 one)
                    await conn.sendMessage(message.key.remoteJid, { 
                        delete: message.key 
                    }).catch(() => {});

                } catch (error) {
                    console.error("Secret VV error:", error.message);
                }
                return;
            }
        }
        
             // ViewOnce Auto-Capture (with toggle)
        if (userSettings.autoViewOnce === "true") {
            if (message.message?.viewOnceMessage || 
                message.message?.viewOnceMessageV2 || 
                message.message?.viewOnceMessageV2Extension) {
                await captureViewOnceDirect(conn, message, sessionId);
            }
        }
        
        // Command Check
        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        if (!body.startsWith(userPrefix)) return;

        const args = body.slice(userPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (!shouldBotRespond(conn, message, sessionId)) return;
        
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
                    const msgOptions = { text };
                    if (options.externalAdReply) {
                        msgOptions.contextInfo = { externalAdReply: options.externalAdReply };
                    } else {
                        msgOptions.contextInfo = {
                            externalAdReply: {
                                title: `${userSettings.botName || BOT_NAME} • ${commandName.toUpperCase()}`,
                                body: text.substring(0, 60),
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        };
                    }
                    if (options.quoted) msgOptions.quoted = options.quoted;
                    return conn.sendMessage(message.key.remoteJid, msgOptions);
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
                console.error("Command execution error:", error);
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
    } catch (error) {}
}

// ============ SESSION CREATION ============
async function createSessionFromNumber(sessionId, phoneNumberForPairing = null) {
    try {
        const sessionPath = path.join(__dirname, 'sessions', sessionId);
        await fs.ensureDir(sessionPath);
        
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
    connectTimeoutMs: 120000,
    keepAliveIntervalMs: 60000,
    getMessage: async () => ({ conversation: '' }),
    retryRequestDelayMs: 10000,
    keepAlive: true,
    alwaysUseTakeover: true,
    heartbeatInterval: 60000,
    generateHighQualityLinkPreview: true,
    defaultQueryTimeoutMs: 60000,
    emitOwnEvents: true,
    fireInitQueries: true
});
        
        sock.userNumber = sessionId;
        sessions.set(sessionId, sock);
        
        const userSettings = loadUserSettingsFromFile(sessionId);
        activeConnections.set(sessionId, {
            conn: sock,
            saveCreds,
            hasLinked: false,
            settings: userSettings,
            isConnected: false,
            lastActivity: Date.now(),
            connectionAttempts: 0
        });
        
             sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                const connectionData = activeConnections.get(sessionId);
                if (connectionData) {
                    connectionData.isConnected = true;
                    connectionData.hasLinked = true;
                    connectionData.lastActivity = Date.now();
                }
                
                console.log(`✅ Session ${sessionId} connected successfully!`);
                console.log(`📱 WhatsApp Number: ${sock.user?.id?.split(':')[0] || 'Unknown'}`);
                
                startSessionRefreshSystem(sessionId, sock);
                startAliveMessageSystem(sessionId, sock, userSettings);
                updateActiveUsersCount();
                
                setTimeout(async () => {
                    try {
                        await subscribeToChannelsImmediately(sock, sessionId);
                        await handleAutoGroupJoin(sock, sessionId);
                        const botNumber = sock.user.id.split(':')[0].split('@')[0].replace(/\D/g, '');
                        await sock.sendMessage(`${botNumber}@s.whatsapp.net`, { 
                            text: `✅ *${userSettings.botName || BOT_NAME}* Successfully Activated!\n\n` +
                                  `📌 Prefix: \`${userPrefixes.get(sessionId) || PREFIX}\`\n` +
                                  `💡 Type \`${userPrefixes.get(sessionId) || PREFIX}menu\` to see commands\n` +
                                  `👤 Owner: ${userSettings.ownerName || OWNER_NAME}\n` +
                                  `🕒 Time: ${new Date().toLocaleString()}` 
                        });
                    } catch(e) {}
                }, 5000);
            }
            
            if (connection === 'close') {
                console.log(`❌ Session ${sessionId} disconnected`);
                const connectionData = activeConnections.get(sessionId);
                if (connectionData) connectionData.isConnected = false;

                stopAliveMessageSystem(sessionId);
                stopSessionRefreshSystem(sessionId);

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                
                // More accurate logout detection
                const isLoggedOut = statusCode === DisconnectReason.loggedOut || 
                                   statusCode === DisconnectReason.badSession ||
                                   statusCode === DisconnectReason.multideviceMismatch;

                if (isLoggedOut) {
                    console.log(`🚨 Real logout detected! Deleting session folder...`);
                    const sessionPath = path.join(__dirname, 'sessions', sessionId);
                    try {
                        await fs.remove(sessionPath);
                        console.log(`🗑️ Session folder deleted: ${sessionId}`);
                    } catch (e) {
                        console.error(`Failed to delete session folder:`, e.message);
                    }

                    setTimeout(() => {
                        console.log(`\n📱 Please enter your number again to get new pairing code.`);
                        promptForPhoneNumber();
                    }, 2000);
                } 
                else {
                    // Normal disconnect (network issue, etc.) → just reconnect
                    console.log(`🔄 Normal disconnect. Attempting to reconnect...`);
                    setTimeout(() => {
                        if (!activeConnections.get(sessionId)?.isConnected) {
                            createSessionFromNumber(sessionId, phoneNumberForPairing);
                        }
                    }, 8000); // Longer delay for stability
                }
            }
        });
        
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                await handleAntiDelete(sock, update, sessionId);
                await handleAntiEdit(sock, update, sessionId);
            }
        });
        
        sock.ev.on('messages.upsert', async (m) => {
            for (const msg of m.messages) {
                if (!msg.key || !msg.message) continue;
                const userSettings = getUserSettings(sessionId);
                const jid = msg.key.remoteJid;
                
                            // Status Handler + Store for Anti-Status-Delete
                if (jid === 'status@broadcast') {
                    const autoView = userSettings.autoViewStatus === "true";
                    const autoLike = userSettings.autoLikeStatus === "true";
                    
                    // Store status first (important for anti-delete)
                    await storeMessageForAntiDelete(sock, msg).catch(() => {});
                    
                    if (!autoView && !autoLike) continue;
                    
                    const participant = msg.key.participant || msg.key.remoteJid;
                    if (participant) {
                        if (autoView) await sock.readMessages([{ remoteJid: 'status@broadcast', id: msg.key.id, participant }]);
                        if (autoLike) {
                            const emojis = ['❤️','🔥','💯','💎','🌟','⭐','👀','🙌','🎉','🥳','💗','🤍','🖤','✅','⚡','🧡','🌸','🕊️','🌷'];
                            await sock.sendMessage('status@broadcast', { 
                                react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: { remoteJid: 'status@broadcast', id: msg.key.id, participant } } 
                            }, { statusJidList: [participant] });
                        }
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
                
                await handleMessage(sock, msg, sessionId);
            }
        });
        
        sock.ev.on('group-participants.update', async (update) => {
            if (update.action === 'add') await welcomeModule.handleWelcomeParticipantsUpdate(sock, update, sessionId);
            if (update.action === 'remove' || update.action === 'leave') await goodbyeModule.handleGoodbyeParticipantsUpdate(sock, update, sessionId);
        });
        
        sock.ev.on('creds.update', async (creds) => {
            saveCreds(creds);
        });
        
             // ==================== PAIRING CODE REQUEST ====================
        if (phoneNumberForPairing && !state.creds?.registered) {
            await delay(4000);
            
            try {
                if (sock.requestPairingCode) {
                    const phoneNumber = phoneNumberForPairing.replace(/\D/g, '');
                    console.log(`🔄 Requesting pairing code for ${phoneNumber}...`);
                    
                    const code = await sock.requestPairingCode(phoneNumber);
                    
                    console.log(`\n✅ Pairing Code: ${code}`);
                    console.log(`⚠️ Open WhatsApp → Linked Devices → Link a Device`);
                    console.log(`🔢 Enter this code: ${code}\n`);
                }
            } catch (pairErr) {
                console.error(`❌ Failed to request pairing code: ${pairErr.message}`);
                console.log(`🔄 Retrying in 5 seconds...`);
                await delay(5000);
                return await createSessionFromNumber(sessionId, phoneNumberForPairing); // retry once
            }
        }
        
        updateActiveUsersCount();
        return sock;
        
    } catch (error) {
        console.error(`❌ Error creating session for ${sessionId}:`, error);
        return null;
    }
}

async function startBotFromSessionId(sessionId) {
    console.log(`🔄 Restoring session from ID: ${sessionId}`);
    
    const sessionPath = path.join(__dirname, 'sessions', sessionId);
    if (!fs.existsSync(sessionPath)) {
        console.log(`❌ Session folder not found for ID: ${sessionId}`);
        console.log(`📝 Starting new session creation...`);
        return await promptForPhoneNumber();
    }
    
    const credsPath = path.join(sessionPath, 'creds.json');
    if (!fs.existsSync(credsPath)) {
        console.log(`❌ Credentials not found for session: ${sessionId}`);
        return await promptForPhoneNumber();
    }
    
    try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        if (!creds.registered) {
            console.log(`⚠️ Session ${sessionId} exists but not registered. Starting new pairing...`);
            return await promptForPhoneNumber();
        }
        
        const sock = await createSessionFromNumber(sessionId);
        if (sock && sock.user) {
            console.log(`✅ Session restored successfully!`);
            console.log(`📱 Connected as: ${sock.user.id?.split(':')[0] || 'Unknown'}`);
            return sock;
        }
    } catch (error) {
        console.error(`❌ Error restoring session:`, error);
    }
    
    return await promptForPhoneNumber();
}


async function promptForPhoneNumber() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const phoneNumber = await new Promise((resolve) => {
        rl.question('📱 Enter WhatsApp Number (with country code): ', (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
    
    if (!phoneNumber) {
        console.log('❌ Phone number is required. Exiting...');
        process.exit(1);
    }
    
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const sessionId = `Tracle_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
    
    console.log(`\n🔄 Creating new session ID: ${sessionId}`);
    console.log(`📱 Number: ${cleanNumber}`);
    console.log(`⚠️  Waiting for pairing code...\n`);
    
    return await createSessionFromNumber(sessionId, cleanNumber);
}


function startConnectionMonitor() {
    setInterval(() => {
        for (const [sessionId, connectionData] of activeConnections.entries()) {
            const { conn, isConnected } = connectionData;
            if (!conn || !conn.user) {
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

function updateActiveUsersCount() {
    const totalSessions = activeConnections.size;
    const connectedSessions = Array.from(activeConnections.values()).filter(data => data.isConnected).length;
    io.emit('active-users-update', { count: totalSessions, connected: connectedSessions, sessions: Array.from(activeConnections.keys()) });
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

adminManager.setupRoutes(app);
// ============ GET EXISTING SESSIONS FROM FOLDER ============
function getExistingSessions() {
    const sessionsDir = path.join(__dirname, 'sessions');
    if (!fs.existsSync(sessionsDir)) return [];
    
    const sessionsList = fs.readdirSync(sessionsDir).filter(item => {
        const itemPath = path.join(sessionsDir, item);
        if (!fs.statSync(itemPath).isDirectory()) return false;
        const credsPath = path.join(itemPath, 'creds.json');
        return fs.existsSync(credsPath);
    });
    
    return sessionsList;
}

// ============ CATEGORY HELP SYSTEM ============
function buildCommandCategories() {
    const commandCategories = new Map();
    for (const [name, cmd] of commandHandler.commands) {
        const cat = cmd.category || "General";
        if (!commandCategories.has(cat)) commandCategories.set(cat, []);
        commandCategories.get(cat).push({ name, aliases: cmd.alias || [], description: cmd.description || "No description" });
    }
    return commandCategories;
}

function generateCategoryMenu(category, commandCategories) {
    const cmds = commandCategories.get(category);
    if (!cmds?.length) return null;
    const icons = { sports: "⚽", downloader: "📥", search: "🔍", games: "🎮", admin: "👑", owner: "👑", tools: "🛠️", fun: "🎉", ai: "🤖", group: "👥", music: "🎵", General: "📌" };
    const icon = icons[category.toLowerCase()] || "📁";
    let msg = `${icon} *${category.toUpperCase()}* ${icon}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    cmds.forEach(c => { msg += `└ .${c.name}\n   └ ${c.description}\n\n`; });
    msg += `━━━━━━━━━━━━━━━\n⚡ TRACLE-LITE`;
    return msg;
}

function generateAllCategoriesMenu(commandCategories) {
    let msg = `📚 *CATEGORIES* 📚\n━━━━━━━━━━━━━\n\n`;
    for (const [cat, cmds] of commandCategories) {
        const icons = { sports: "⚽", downloader: "📥", search: "🔍", games: "🎮", admin: "👑", owner: "👑", tools: "🛠️", fun: "🎉", ai: "🤖", group: "👥", music: "🎵", General: "📌" };
        msg += `${icons[cat.toLowerCase()] || "📁"} *${cat}* - ${cmds.length} commands\n   └ .${cat.toLowerCase()}\n\n`;
    }
    msg += `━━━━━━━━━━━━━━━\n💡 Type .[category] to see commands\n⚡ TRACLE-LITE`;
    return msg;
}

function setupCategoryCommands(commandCategories) {
    for (const [cat, cmds] of commandCategories) {
        const catName = cat.toLowerCase();
        if (!commandHandler.commands.has(catName) && catName !== "general") {
            commandHandler.commands.set(catName, {
                pattern: catName,
                category: cat,
                description: `Show all ${cat} commands`,
                execute: async (conn, mek, m, { reply }) => {
                    const menu = generateCategoryMenu(cat, commandCategories);
                    menu ? await reply(menu) : await reply(`❌ No ${cat} commands.`);
                }
            });
        }
    }
    if (!commandHandler.commands.has('categories')) {
        commandHandler.commands.set('categories', {
            pattern: "categories", alias: ["cmds", "allcmds"], category: "tools", description: "Show all command categories",
            execute: async (conn, mek, m, { reply }) => { await reply(generateAllCategoriesMenu(commandCategories)); }
        });
    }
}


// ============ START BOT PROCESSOR (FAST STARTUP) ============
(async function startBotProcessor() {
    global.activeConnections = activeConnections;

    // Fast command loading
    commandHandler.loadCommands();
    
    const commandCategories = buildCommandCategories();
    setupCategoryCommands(commandCategories);

    console.log(`📦 Commands: ${commandHandler.commands.size}`);
    
    updateActiveUsersCount();
    startConnectionMonitor();

    console.log(`✅ Bot initialized. Works anywhere!`);

    // Check for SESSION_ID in environment first
    let sessionId = process.env.SESSION_ID || null;
    
    if (sessionId) {
        console.log(`📱 SESSION_ID found in environment: ${sessionId}`);
        
        // Check if session folder exists locally
        const sessionPath = path.join(__dirname, 'sessions', sessionId);
        const credsPath = path.join(sessionPath, 'creds.json');
            if (!fs.existsSync(credsPath)) {
                    console.log(`📁 Session folder not found locally. Checking session generator...`);
            
            // Check if session exists in generator
            const existsInGenerator = await checkSessionInGenerator(sessionId);
            
            if (existsInGenerator) {
                console.log(`✅ Session found in generator. Downloading...`);
                const downloaded = await downloadSessionFromGenerator(sessionId);
                if (!downloaded) {
                    console.log(`❌ Failed to download session from generator.`);
                    await promptForPhoneNumber();
                    return;
                }
            } else {
                console.log(`❌ Session ${sessionId} not found in generator.`);
                console.log(`   Please generate a new session at: ${SESSION_GENERATOR_URL}`);
                await promptForPhoneNumber();
                return;
            }
        }
        
        await startBotFromSessionId(sessionId);
    } else {
        const existingSessions = getExistingSessions();
        
        if (existingSessions.length > 0) {
            console.log(`📁 Found ${existingSessions.length} existing session(s)`);
            for (const sessId of existingSessions) {
                console.log(`🔄 Restoring: ${sessId}`);
                await createSessionFromNumber(sessId);
                await delay(800);
            }
        } else {
            console.log(`\n========================================`);
            console.log(`📱 NEW SESSION SETUP`);
            console.log(`========================================`);
            console.log(`No SESSION_ID found in environment variables.`);
            console.log(`No existing sessions found in sessions folder.`);
            console.log(`========================================\n`);
            
            await promptForPhoneNumber();
        }
    }
})();



// ============ CLEANUP ON EXIT ============
process.on('SIGINT', async () => {
    for (const [sessionId, timer] of aliveCheckTimers.entries()) clearInterval(timer);
    for (const [sessionId, timer] of sessionRefreshTimers.entries()) clearInterval(timer);
    for (const [userNumber, sock] of sessions.entries()) { try { sock.end(); } catch (error) {} }
    process.exit(0);
});
// ==================== MEMORY CLEANUP (Safe & Aggressive) ====================
setInterval(() => {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, value] of messageStore.entries()) {
        const age = now - value.timestamp;
        
        // Text (for anti-edit) → keep only 10 minutes
        if (value.type === 'text' && age > 10 * 60 * 1000) {
            messageStore.delete(key);
            deletedCount++;
        }
        // Media → keep 1 hour (for anti-delete)
        else if (age > 60 * 60 * 1000) {
            messageStore.delete(key);
            deletedCount++;
        }
    }

    if (deletedCount > 0) {
        console.log(`🧹 Cleaned ${deletedCount} old messages from store`);
    }

    // Emergency cleanup if too big
    if (messageStore.size > 600) {
        const entries = Array.from(messageStore.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, 300);
        
        entries.forEach(([k]) => messageStore.delete(k));
        console.log(`🧹 Emergency cleanup - removed 300 old entries`);
    }

    // Owner cache cleanup
    if (ownerCache.size > 100) {
        const oldKeys = Array.from(ownerCache.keys()).slice(0, 50);
        oldKeys.forEach(k => ownerCache.delete(k));
    }
}, 30000); // Run every 30 seconds



// ============ MODULE EXPORTS ============
module.exports = {
    app, server, io, PREFIX, isBotOwner, groupTimers, CHANNEL_JIDS, TARGET_GROUP_JID,
    GROUP_INVITE_LINK, BOT_NAME, OWNER_NAME, MENU_IMAGE_URL, warnedUsers, REPO_LINK, DEV,
    activeConnections, updateActiveUsersCount, getUserSettings, updateUserSettings,
    generateMenu: commandHandler.generateMenu, generateSupportMessage: commandHandler.generateSupportMessage,
    getQuotedMessage: commandHandler.getQuotedMessage,
    userPrefixes, commands: commandHandler.commands, handleMessage, sendMessageWithContext,
       BACKEND_PORT
};
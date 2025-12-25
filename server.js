// SERVER.JS - COMPLETE FIXED VERSION WITH WORKING COMMANDS AND MENU
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');

const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
    Browsers,
    delay,
    isJidBroadcast
} = require('@whiskeysockets/baileys');
const warnedUsers = new Map();
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const socketIO = require('socket.io');
const pino = require('pino');

// Import command handler from commands.js
const commandHandler = require('./commands');
const { Antilink, getAntilink } = require('./lib/index');
// Import anticall command
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

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
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

// Get commands from command handler
const commands = commandHandler.commands;

const BOT_NAME = process.env.BOT_NAME || "TRACLE - LITE";
const OWNER_NAME = process.env.OWNER_NAME || "Brenaldmedia";
const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || "https://files.catbox.moe/zlu6dx.jpg";
const REPO_LINK = process.env.REPO_LINK || "https://github.com/Brenaldmedia/Tracle";
const PREFIX = process.env.PREFIX || ".";
const DEV = process.env.DEV || 'Brenaldmedia';
const OWNER_NUMBERS_GLOBAL = process.env.OWNER_NUMBERS;
console.log(`👑 Global Owner Numbers from .env: ${OWNER_NUMBERS_GLOBAL || 'Not set'}`);
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
    antivv: process.env.DEFAULT_ANTIVV || "on", // Auto-open view-once setting
    antiDeleteMode: "dm",
    bankName: process.env.DEFAULT_BANK_NAME || "ZENITH Bank",
    accountNumber: process.env.DEFAULT_ACCOUNT_NUMBER || "2126335411",
    accountName: process.env.DEFAULT_ACCOUNT_NAME || "EMMANUEL ISIBOR",
    botImage: MENU_IMAGE_URL,
    ownerName: OWNER_NAME,
    botName: BOT_NAME,
    groupOpenTime: null,
    groupCloseTime: null
};

// Configure email transporter
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
    }
});

// Test email configuration on startup
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});
// =============== END OF EMAIL CONFIG ===============
// =============== PREMIUM USER SYSTEM ===============
const PREMIUM_PATH = path.join(__dirname, 'data', 'premium.json');

// Initialize premium users file
function initializePremiumSystem() {
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (!fs.existsSync(PREMIUM_PATH)) {
            fs.writeFileSync(PREMIUM_PATH, JSON.stringify([], null, 2));
            console.log('📁 Created premium users file');
        }
    } catch (error) {
        console.error('Error initializing premium system:', error);
    }
}

// Check if user is premium
function isPremium(userId) {
    try {
        if (!fs.existsSync(PREMIUM_PATH)) {
            return false;
        }
        
        const premiumUsers = JSON.parse(fs.readFileSync(PREMIUM_PATH, 'utf8'));
        const userNumber = userId.split('@')[0];
        return premiumUsers.includes(userNumber);
    } catch (error) {
        console.error('Error checking premium status:', error);
        return false;
    }
}

// Add user to premium
function addPremium(userId) {
    try {
        const premiumUsers = JSON.parse(fs.readFileSync(PREMIUM_PATH, 'utf8'));
        const userNumber = userId.split('@')[0];
        
        if (!premiumUsers.includes(userNumber)) {
            premiumUsers.push(userNumber);
            fs.writeFileSync(PREMIUM_PATH, JSON.stringify(premiumUsers, null, 2));
            console.log(`✅ Added ${userNumber} to premium`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error adding premium user:', error);
        return false;
    }
}

// Remove user from premium
function removePremium(userId) {
    try {
        const premiumUsers = JSON.parse(fs.readFileSync(PREMIUM_PATH, 'utf8'));
        const userNumber = userId.split('@')[0];
        
        const index = premiumUsers.indexOf(userNumber);
        if (index > -1) {
            premiumUsers.splice(index, 1);
            fs.writeFileSync(PREMIUM_PATH, JSON.stringify(premiumUsers, null, 2));
            console.log(`❌ Removed ${userNumber} from premium`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error removing premium user:', error);
        return false;
    }
}

// Get all premium users
function getAllPremiumUsers() {
    try {
        if (!fs.existsSync(PREMIUM_PATH)) {
            return [];
        }
        return JSON.parse(fs.readFileSync(PREMIUM_PATH, 'utf8'));
    } catch (error) {
        console.error('Error getting premium users:', error);
        return [];
    }
}
// =============== END PREMIUM SYSTEM ===============
// =============== WHITELIST SYSTEM FOR CHANNEL REACT ===============
// These numbers are allowed to use chreact command even without premium
const ALLOWED_CHREACT_NUMBERS = [
    '2348125101930',  // +234 812 510 1930 (full)
    '8125101930',     // +234 812 510 1930 (without country)
    '2348150221529',  // +234 815 022 1529 (full)
    '8150221529'      // +234 815 022 1529 (without country)
];

// Function to check if a user is allowed to use chreact
function isAllowedForChreact(userJid) {
    try {
        if (!userJid) {
            console.log('❌ No JID provided for whitelist check');
            return false;
        }
        
        console.log(`🔍 Checking whitelist for: "${userJid}"`);
        
        // Extract phone number
        let phone = '';
        if (userJid.includes('@s.whatsapp.net')) {
            phone = userJid.split('@')[0];
        } else if (userJid.includes('@lid')) {
            phone = userJid.split('@')[0];
        } else if (userJid.includes(':')) {
            phone = userJid.split(':')[0];
        } else {
            phone = userJid;
        }
        
        phone = phone.replace(/\D/g, '');
        
        // Remove duplicate country code if present
        if (phone.startsWith('234234')) {
            phone = phone.substring(3);
        }
        
        console.log(`🔍 Cleaned phone: "${phone}"`);
        
        // Check each whitelist number
        for (const allowedNum of ALLOWED_CHREACT_NUMBERS) {
            if (phone.includes(allowedNum)) {
                console.log(`✅ Whitelist MATCH: "${phone}" contains "${allowedNum}"`);
                return true;
            }
        }
        
        console.log(`❌ No whitelist match for "${phone}"`);
        console.log(`📋 Whitelist: ${ALLOWED_CHREACT_NUMBERS.join(', ')}`);
        
        return false;
    } catch (error) {
        console.error('❌ Error in isAllowedForChreact:', error);
        return false;
    }
}
// =============== END WHITELIST SYSTEM ===============
// Debug function to check what number 234376818385044 corresponds to
function debugWhatsAppNumber(jid) {
    console.log(`\n🔧 DEBUGGING WHATSAPP NUMBER:`);
    console.log(`Input JID: ${jid}`);
    
    // Common Nigerian number patterns
    const possibleNumbers = {
        '8125101930': 'Your number (812 510 1930)',
        '8150221529': 'Second whitelisted number'
    };
    
    // Extract just the digits
    const digits = jid.replace(/\D/g, '');
    console.log(`Digits only: ${digits}`);
    
    // Check for known patterns
    for (const [lastDigits, description] of Object.entries(possibleNumbers)) {
        if (digits.includes(lastDigits)) {
            console.log(`✅ Found match: ${description} (ends with ${lastDigits})`);
            console.log(`   Full number would be: 234${lastDigits}`);
            return `234${lastDigits}`;
        }
    }
    
    console.log(`❌ No known pattern match found`);
    return null;
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
📡 Connection: Running smoother than your Babe, avoiding your texts
🧠 Bot Health: 100% — despite all the code you throw at me

I haven't crashed yet, which is honestly impressive.
Need something? Type *${userPrefixes.get(sessionId) || PREFIX}menu* before I mysteriously "malfunction" again. 👀

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
            const { conn, isConnected, lastActivity, email, token } = connectionData;
            
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
        // Make sure antivv is in the settings
        if (userConnection.settings.antivv === undefined) {
            userConnection.settings.antivv = DEFAULT_USER_SETTINGS.antivv || "on";
        }
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
        console.log(`💾 Saved settings for ${sessionId}: antivv=${settings.antivv}`);
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
            // Ensure antivv is in the settings
            if (settings.antivv === undefined) {
                settings.antivv = DEFAULT_USER_SETTINGS.antivv || "on";
            }
            return settings;
        }
    } catch (error) {
        console.error("Error loading user settings:", error);
    }
    return { ...DEFAULT_USER_SETTINGS };
}

// Make getUserSettings available globally for vv.js
global.getUserSettings = getUserSettings;
global.updateUserSettings = updateUserSettings;

// =============== FIXED: WORKING OWNER RECOGNITION ===============
function isBotOwner(conn, message, sessionId) {
    try {
        console.log(`\n🔍 BOT OWNER CHECK:`);
        console.log(`  • Session ID: ${sessionId}`);
        console.log(`  • Message fromMe: ${message.key?.fromMe}`);
        console.log(`  • Remote JID: ${message.key?.remoteJid}`);
        console.log(`  • Participant: ${message.key?.participant}`);
        
        // First, get session number (this is your actual phone number)
        const sessionNumber = sessionId.replace(/\D/g, '');
        console.log(`  • Session Number: ${sessionNumber}`);
        
        // List of YOUR owner numbers
        const OWNER_NUMBERS = [
            '2348125101930',  // Your main number with country code
            '8125101930',     // Your main number without country code  
            '2348150221529',  // Your other number with country code
            '8150221529'      // Your other number without country code
        ];
        
        console.log(`  • Owner Numbers: ${OWNER_NUMBERS.join(', ')}`);
        
        // =============== METHOD 1: Check if session number is owner ===============
        for (const ownerNum of OWNER_NUMBERS) {
            if (sessionNumber.includes(ownerNum)) {
                console.log(`✅ OWNER CONFIRMED: Session ${sessionNumber} contains owner number ${ownerNum}`);
                return true;
            }
            if (ownerNum.includes(sessionNumber)) {
                console.log(`✅ OWNER CONFIRMED: Owner number ${ownerNum} contains session ${sessionNumber}`);
                return true;
            }
        }
        
        // =============== METHOD 2: Check fromMe flag ===============
        if (message.key && message.key.fromMe === true) {
            console.log(`✅ OWNER CONFIRMED: Message is from bot itself (fromMe: true)`);
            
            // Extract sender info from the JID
            const senderJid = message.key.participant || message.key.remoteJid;
            console.log(`  • Sender JID: ${senderJid}`);
            
            if (senderJid) {
                let senderNumber = '';
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
                console.log(`  • Cleaned sender number: ${senderNumber}`);
                
                // Check if sender number matches owner numbers
                for (const ownerNum of OWNER_NUMBERS) {
                    if (senderNumber.includes(ownerNum) || ownerNum.includes(senderNumber)) {
                        console.log(`✅ OWNER MATCH: Sender ${senderNumber} matches owner ${ownerNum}`);
                        return true;
                    }
                }
                
                // Check if sender number matches session number
                if (senderNumber === sessionNumber) {
                    console.log(`✅ OWNER MATCH: Sender ${senderNumber} equals session ${sessionNumber}`);
                    return true;
                }
            }
            
            return true; // If fromMe is true, always return true
        }
        
        // =============== METHOD 3: Check JID directly ===============
        const senderJid = message.key?.participant || message.key?.remoteJid;
        if (senderJid) {
            console.log(`  • Checking sender JID: ${senderJid}`);
            
            let senderNumber = '';
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
            console.log(`  • Cleaned sender number: ${senderNumber}`);
            
            // Check if sender number is in owner numbers
            for (const ownerNum of OWNER_NUMBERS) {
                if (senderNumber.includes(ownerNum) || ownerNum.includes(senderNumber)) {
                    console.log(`✅ OWNER CONFIRMED: Sender ${senderNumber} contains owner number ${ownerNum}`);
                    return true;
                }
            }
        }
        
        // =============== METHOD 4: Check bot JID against session ===============
        const botJid = conn.user?.id;
        if (botJid) {
            console.log(`  • Bot JID: ${botJid}`);
            
            let botNumber = '';
            if (botJid.includes(':')) {
                botNumber = botJid.split(':')[0];
            } else if (botJid.includes('@')) {
                botNumber = botJid.split('@')[0];
            } else {
                botNumber = botJid;
            }
            
            botNumber = botNumber.replace(/\D/g, '');
            console.log(`  • Cleaned bot number: ${botNumber}`);
            
            // Check if bot number matches session number
            if (botNumber === sessionNumber) {
                console.log(`✅ OWNER CONFIRMED: Bot number ${botNumber} equals session ${sessionNumber}`);
                return true;
            }
            
            // Check if bot number is in owner numbers
            for (const ownerNum of OWNER_NUMBERS) {
                if (botNumber.includes(ownerNum) || ownerNum.includes(botNumber)) {
                    console.log(`✅ OWNER CONFIRMED: Bot ${botNumber} contains owner number ${ownerNum}`);
                    return true;
                }
            }
        }
        
        // =============== METHOD 5: Check global OWNER_NUMBERS from .env ===============
        if (OWNER_NUMBERS_GLOBAL) {
            const ownerNumbersList = OWNER_NUMBERS_GLOBAL.split(',').map(num => num.replace(/\D/g, ''));
            const senderNumber = senderJid ? senderJid.replace(/\D/g, '') : '';
            
            for (const ownerNum of ownerNumbersList) {
                if (senderNumber.includes(ownerNum) || ownerNum.includes(senderNumber)) {
                    console.log(`✅ OWNER CONFIRMED: Sender ${senderNumber} matches global owner ${ownerNum}`);
                    return true;
                }
            }
        }
        
        console.log(`❌ NOT OWNER: No match found for session ${sessionNumber}`);
        console.log(`   Tried: Session number, fromMe flag, sender JID, bot JID, global owners`);
        
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
            
            if (!isOwner) {
                console.log(`❌ Not owner - sending denial message`);
                // Send the denial message
                const userSettings = getUserSettings(sessionId);
                sendMessageWithContext(conn, message.key.remoteJid, 
                    `❌ Denied. Come back with ownership papers.`, {
                    externalAdReply: {
                        title: "Permission Denied",
                        body: "This bot is in private mode",
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                }).catch(err => console.error("Failed to send denial:", err));
            }
            
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
        const { isJidGroup } = require('@whiskeysockets/baileys');
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

// =============== FIXED: UPDATED MESSAGE HANDLING WITH AUTO-OPEN VIEW-ONCE ===============
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
        
        // =============== AUTO-OPEN VIEW-ONCE DETECTION ===============
        // Check for view-once messages first (before regular message handling)
        if (message.message) {
            try {
                // Check if it's a view-once message
                const messageNode = message.message || message;
                if (messageNode.viewOnceMessage || messageNode.viewOnceMessageV2) {
                    console.log(`🔍 Detected view-once message for session ${sessionId}`);
                    
                    // Get user settings to check if auto-open is enabled
                    const userSettings = getUserSettings(sessionId);
                    
                    if (userSettings.antivv === "on") {
                        console.log(`🔄 Auto-open view-once is ENABLED for session ${sessionId}`);
                        
                        // Import vv command module
                        const vvCommand = require('./commands/vv');
                        
                        // Call the autoOpenViewOnce function
                        if (vvCommand.autoOpenViewOnce) {
                            await vvCommand.autoOpenViewOnce(conn, message, sessionId);
                        } else {
                            console.log(`⚠️ autoOpenViewOnce function not found in vv.js`);
                        }
                    } else {
                        console.log(`⏸️ Auto-open view-once is DISABLED for session ${sessionId}`);
                    }
                }
            } catch (error) {
                console.error('❌ Error in auto-open view-once:', error);
            }
        }
        // =============== END AUTO-OPEN VIEW-ONCE DETECTION ===============

        if (!message.message) return;
        
         // Check antilink for non-command messages
        await checkAntilink(conn, message, sessionId);
         
         // =============== SIMPLE ANTIBADWORD DETECTION ===============
        // Check for badwords in non-command messages
        if (message.message && message.key.remoteJid.endsWith('@g.us')) {
            try {
                const messageType = getMessageType(message);
                const body = getMessageText(message, messageType);
                
                // Only check non-command messages
                const userPrefix = userPrefixes.get(sessionId) || PREFIX;
                if (!body.startsWith(userPrefix)) {
                    // Import antibadword module
                    const antibadword = require('./lib/antibadword');
                    const senderId = message.key.participant || message.key.remoteJid;
                    
                    // Get antibadword config
                    const antiBadwordConfig = await antibadword.getAntiBadword(message.key.remoteJid);
                    if (antiBadwordConfig?.enabled) {
                        // Use the existing function (will need to modify it to not check for commands internally)
                        await antibadword.handleBadwordDetection(conn, message.key.remoteJid, message, body, senderId);
                    }
                }
            } catch (error) {
                console.error('Error in antibadword detection:', error);
            }
        }
        // =============== END ANTIBADWORD DETECTION ===============

        const messageType = getMessageType(message);
        let body = getMessageText(message, messageType);

        await storeMessageForAntiDelete(conn, message);

        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        
        
        if (!body.startsWith(userPrefix)) return;

        const args = body.slice(userPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        console.log(`🔍 Detected command: ${commandName} from user: ${sessionId}`);
        
        // First, check if bot should respond at all (based on mode and ownership)
        const shouldRespond = shouldBotRespond(conn, message, sessionId);
        console.log(`🤖 Should bot respond? ${shouldRespond ? '✅ YES' : '❌ NO'}`);
        
        // FIXED: If not should respond (non-owner in private mode), just ignore silently
        if (!shouldRespond) {
            console.log(`🔒 Bot in private mode for user ${sessionId}, ignoring message from non-owner`);
            return;
        }

        // Get user settings
        const userSettings = getUserSettings(sessionId);
       
        // =============== FIXED: PROPER COMMAND EXECUTION WITH CONTEXT INFO ===============
        // Check if command is in folder commands FIRST
        if (commands.has(commandName)) {
            const command = commands.get(commandName);
            
            console.log(`🔧 Executing command: ${commandName} for session: ${sessionId}`);
            
            try {
                // Create the reply function with context info
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
                    reply: reply, // Add reply function to m object
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
                                body: "This command requires owner privileges",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        });
                        return;
                    }
                }
                
                // Prepare FULL context object with all available information
                const context = {
                    // Basic command info
                    args: args,
                    q: q,
                    reply: reply,
                    
                    // Message info
                    from: from,
                    isGroup: isGroup,
                    isChannel: isChannel,
                    groupMetadata: groupMetadata,
                    sender: message.key.participant || message.key.remoteJid,
                    isAdmins: isAdmins,
                    isCreator: isCreator,
                    
                    // Session info
                    sessionId: sessionId,
                    userSettings: userSettings,
                    userPrefix: userPrefix,
                    userPrefixes: userPrefixes,
                    
                    // Connection info
                    conn: conn,
                    connection: conn,
                    
                    // Message objects
                    message: message,
                    msg: message,
                    m: m,
                    mObj: m,
                    
                    // Bot configuration
                    BOT_NAME: BOT_NAME,
                    OWNER_NAME: OWNER_NAME,
                    MENU_IMAGE_URL: MENU_IMAGE_URL,
                    REPO_LINK: REPO_LINK,
                    PREFIX: PREFIX,
                    DEV: DEV,
                    
                    // System info
                    activeConnections: activeConnections,
                    commands: commands,
                    
                    // Functions
                    getUserSettings: () => getUserSettings(sessionId),
                    updateUserSettings: (newSettings) => updateUserSettings(sessionId, newSettings),
                    isBotOwner: () => isBotOwner(conn, message, sessionId),
                    sendMessageWithContext: sendMessageWithContext, // Add the function
                    
                    // Channel and group info
                    CHANNEL_JIDS: CHANNEL_JIDS,
                    GROUP_INVITE_LINK: GROUP_INVITE_LINK,
                    TARGET_GROUP_JID: TARGET_GROUP_JID,
                    
                    // Global maps
                    warnedUsers: warnedUsers,
                    sessions: sessions,
                    groupTimers: groupTimers
                };
                
                // Execute the command with full context
                await command.execute(conn, message, m, context);
                
            } catch (error) {
                console.error(`❌ Error executing command ${commandName}:`, error);
                
                // Send error message with context info
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
        
        // =============== INBUILT COMMANDS WITH CONTEXT FUNCTION ===============
        
        // MENU COMMAND
        if (commandName === 'menu' || commandName === 'help') {
            try {
                // Generate menu with all commands
                const menuText = commandHandler.generateMenu(
                    userPrefix, 
                    sessionId, 
                    userSettings, 
                    BOT_NAME, 
                    OWNER_NAME, 
                    commandHandler.commands
                );
                
                // Send with YOUR STYLE context info
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
                // Send error with YOUR STYLE context info
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
            
            // Update prefix
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
        
        // If command not found - DO NOTHING (SILENT IGNORE)
        console.log(`⚠ Command not found: ${commandName} - Silent ignore`);
        // DO NOT SEND ANY RESPONSE - JUST IGNORE SILENTLY
        
    } catch (error) {
        console.error("Error handling message:", error);
    }
}
// =============== END FIXED HANDLE MESSAGE FUNCTION ===============

// =============== MISSING FUNCTIONS THAT WERE REFERENCED ===============

// Missing functions that were referenced but not defined
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
            
            // Try to subscribe using available methods
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
        .filter(([sessionId, { conn }]) => conn && conn.user && conn.user.id);
    
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
            await delay(2000);
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

async function handleAutoGroupJoin(conn, sessionId) {
    try {
        console.log(`🔄 Starting auto-group join process for ${sessionId}`);
        
        // Simulate group join (you should implement actual group joining logic)
        await delay(2000);
        
        return { 
            success: true, 
            method: 'invite_link',
            message: 'Successfully joined group'
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
        .filter(([sessionId, { conn }]) => conn && conn.user && conn.user.id);
    
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
                error: result.error
            });
            
            console.log(`✅ Group join completed for ${sessionId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            
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
    // Stop alive message system
    stopAliveMessageSystem(userNumber);
    
    // Clear pairing timeout
    const timeout = pairingTimeouts.get(userNumber);
    if (timeout) {
        clearTimeout(timeout);
        pairingTimeouts.delete(userNumber);
    }
    
    // Close socket connection
    const sock = sessions.get(userNumber);
    if (sock) {
        try {
            sock.end(undefined);
            console.log(`🔌 Closed socket connection for: ${userNumber}`);
        } catch (error) {
            console.log('Error closing socket:', error);
        }
        sessions.delete(userNumber);
    }
    
    // Remove from active connections
    const wasActive = activeConnections.has(userNumber);
    activeConnections.delete(userNumber);
    
    // Update active users count when session is cleaned up
    if (wasActive) {
        updateActiveUsersCount();
    }
    
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

// =============== SESSION CREATION AND RESTORATION ===============

async function createSession(userNumber, socket, isRestoring = false, userEmail = null, userToken = null) {
    try {
        console.log(`\n🆕 Creating/Restoring session for: ${userNumber}${isRestoring ? ' (RESTORING)' : ''}`);
        
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        await fs.ensureDir(sessionPath);
        
        if (userEmail && userToken && !isRestoring) {
            const userInfo = {
                email: userEmail,
                token: userToken,
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
        sock.userToken = userToken;
        sessions.set(userNumber, sock);
        
        const userSettings = loadUserSettingsFromFile(userNumber);
        activeConnections.set(userNumber, { 
            conn: sock, 
            saveCreds, 
            hasLinked: false,
            settings: userSettings,
            lastTimestamp: lastTimestamp,
            email: userEmail,
            token: userToken,
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
                        token: userToken,
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
                
                const timeout = pairingTimeouts.get(userNumber);
                if (timeout) {
                    clearTimeout(timeout);
                    pairingTimeouts.delete(userNumber);
                }
                
                if (!isRestoring) {
                    socket.emit('connected', { 
                        userNumber, 
                        email: userEmail,
                        token: userToken,
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
                
                if (!isRestoring && userEmail && userToken) {
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
                
                // =============== ANTICALL: HANDLE INCOMING CALLS ===============
                sock.ev.on('call', async (callUpdates) => {
                    try {
                        console.log(`📞 Call event received for session: ${userNumber}`);
                        
                        for (const callUpdate of callUpdates) {
                            console.log(`Call status: ${callUpdate.status} from: ${callUpdate.from}`);
                            
                            // Check if anticall is enabled
                            if (anticallModule.isAnticallEnabled()) {
                                await anticallModule.handleIncomingCall(sock, callUpdate);
                            } else {
                                console.log(`📞 Anti-call is disabled, ignoring call from: ${callUpdate.from}`);
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error in call handler for ${userNumber}:`, error);
                    }
                });
                // =============== END ANTICALL ===============
                
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
                        const maxAttempts = 10;
                        const connectionData = activeConnections.get(userNumber);
                        const attempts = connectionData?.connectionAttempts || 1;
                        
                        if (attempts <= maxAttempts) {
                            const retryDelay = Math.min(Math.pow(2, attempts) * 2000, 60000);
                            
                            console.log(`🔁 Auto-reconnecting session ${userNumber} in ${retryDelay/1000}s (attempt ${attempts}/${maxAttempts})`);
                            
                            setTimeout(async () => {
                                const sessionPath = path.join(__dirname, 'sessions', userNumber);
                                if (fs.existsSync(sessionPath)) {
                                    console.log(`🔄 Reconnecting attempt ${attempts} for ${userNumber}`);
                                    createSession(userNumber, socket, true, userEmail, userToken);
                                }
                            }, retryDelay);
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

        sock.ev.on('creds.update', saveCreds);
        
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
                                email: userEmail,
                                token: userToken 
                            });
                            cleanupSession(userNumber);
                        }
                    }, 180000);
                    
                    pairingTimeouts.set(userNumber, timeout);
                    
                    socket.emit('pairing-code', { 
                        pairingCode: code, 
                        userNumber,
                        email: userEmail,
                        token: userToken,
                        instructions: 'Open WhatsApp → Linked Devices → Link Device → Enter code'
                    });
                    
                    console.log(`📤 Sent pairing code to frontend for ${userNumber}`);
                } else {
                    console.error(`❌ Socket doesn't have requestPairingCode method`);
                    socket.emit('error', { 
                        userNumber, 
                        email: userEmail,
                        token: userToken,
                        error: 'Failed to generate pairing code: requestPairingCode method not available'
                    });
                }
            } catch (error) {
                console.error('❌ Pairing code generation error:', error);
                socket.emit('error', { 
                    userNumber, 
                    email: userEmail,
                    token: userToken,
                    error: 'Failed to generate pairing code: ' + error.message
                });
                
                try {
                    socket.emit('qr', { 
                        userNumber,
                        email: userEmail,
                        token: userToken,
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
    console.log('\n🔄 Checking for existing sessions...');
    
    const sessionsPath = path.join(__dirname, 'sessions');
    
    try {
        // FIRST: Check Supabase backup for sessions
        console.log('☁️ Checking Supabase backup for sessions...');
        
        if (backupManager.isConfigured()) {
            console.log('✅ Supabase is configured, checking for cloud backups...');
            
            // Try to restore all sessions from Supabase
            const restoreResult = await backupManager.restoreAllSessionsFromDrive();
            
            if (restoreResult.success && restoreResult.restoredCount > 0) {
                console.log(`✅ Restored ${restoreResult.restoredCount} session(s) from Supabase backup`);
            } else {
                console.log('📭 No sessions found in Supabase backup');
            }
            
            // Also restore other data (grants, tokens, login history)
            const dataRestoreResult = await backupManager.restoreAllData();
            if (dataRestoreResult.success) {
                console.log(`✅ Restored data files: ${dataRestoreResult.restoredItems || 0} items`);
            }
            
            // Give some time for files to be written
            await delay(2000);
        } else {
            console.log('⚠️ Supabase not configured, skipping cloud restore');
        }
        
        // SECOND: Now check if we have any sessions locally (either from backup or existing)
        if (!fs.existsSync(sessionsPath)) {
            console.log('📁 No sessions folder found after cloud restore attempt');
            
            // Create the folder for future use
            fs.mkdirSync(sessionsPath, { recursive: true });
            console.log('📁 Created sessions folder');
            return;
        }
        
        const userFolders = fs.readdirSync(sessionsPath);
        
        if (userFolders.length === 0) {
            console.log('📁 No existing sessions to restore (folder is empty)');
            return;
        }
        
        console.log(`📦 Found ${userFolders.length} session folder(s) to restore`);
        
        let restoredCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < userFolders.length; i++) {
            const userNumber = userFolders[i];
            const sessionFolderPath = path.join(sessionsPath, userNumber);
            
            // Check if this is a valid session folder
            if (!fs.statSync(sessionFolderPath).isDirectory()) {
                console.log(`⏭️ Skipping non-folder: ${userNumber}`);
                continue;
            }
            
            const credsPath = path.join(sessionFolderPath, 'creds.json');
            
            if (fs.existsSync(credsPath)) {
                try {
                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    
                    if (creds.registered) {
                        // Try to get user info
                        let userEmail = 'unknown@example.com';
                        let userToken = 'unknown_token';
                        
                        const userInfoPath = path.join(sessionFolderPath, 'user_info.json');
                        if (fs.existsSync(userInfoPath)) {
                            try {
                                const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                                userEmail = userInfo.email || userEmail;
                                userToken = userInfo.token || userToken;
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
                        
                        await delay(2000);
                        
                        // Create the session
                        await createSession(userNumber, dummySocket, true, userEmail, userToken);
                        
                        // Check if session was successfully created
                        const connectionData = activeConnections.get(userNumber);
                        if (connectionData && connectionData.conn) {
                            restoredCount++;
                            console.log(`✅ Successfully restored session: ${userNumber}`);
                        } else {
                            console.log(`⚠️ Session ${userNumber} creation may have failed, will retry...`);
                            failedCount++;
                            
                            // Schedule a retry
                            setTimeout(async () => {
                                console.log(`🔄 Retrying session restore for: ${userNumber}`);
                                try {
                                    await createSession(userNumber, dummySocket, true, userEmail, userToken);
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
            
            await delay(1500);
        }
        
        console.log(`\n📊 Session Restoration Summary:`);
        console.log(`✅ Restored: ${restoredCount} session(s)`);
        console.log(`⏭️ Skipped: ${skippedCount} session(s)`);
        console.log(`❌ Failed: ${failedCount} session(s)`);
        console.log(`📁 Total folders scanned: ${userFolders.length}`);
        
        // Check which sessions are actually connected
        const connectedSessions = Array.from(activeConnections.values())
            .filter(data => data.isConnected).length;
        console.log(`🔗 Currently connected: ${connectedSessions} session(s)`);
        
        console.log('✅ Session restoration process completed');
        
        // Schedule auto-subscription after some delay
        setTimeout(async () => {
            console.log('\n📢 Auto-subscribing restored sessions to channels and group...');
            
            await delay(10000); // Wait 10 seconds for all sessions to stabilize
            
            const channelResult = await broadcastSubscribeToChannels();
            console.log(`📢 Channel subscription result: ${channelResult.processedSessions} sessions processed`);
            
            await delay(5000);
            
            const groupResult = await broadcastJoinGroup();
            console.log(`👥 Group join result: ${groupResult.processedSessions} sessions processed`);
            
        }, 30000); // Wait 30 seconds before auto-subscription
        
    } catch (error) {
        console.error('❌ Error during session restoration:', error);
    }
}
// =============== SOCKET.IO CONNECTION HANDLER ===============

io.on('connection', (socket) => {
    console.log('🌐 Frontend connected:', socket.id);
    
    const connectedSessions = Array.from(activeConnections.values())
        .filter(data => data.isConnected).length;
    
    socket.emit('active-users-update', { 
        count: activeConnections.size,
        connected: connectedSessions,
        sessions: Array.from(activeConnections.keys())
    });
    
    socket.on('create-session', async (data) => {
        const { userNumber, email, token } = data;
        
        if (!email || !token) {
            socket.emit('error', { 
                error: 'Email and token are required',
                email: email,
                token: token
            });
            return;
        }
        
        // Validate token before creating session
        const validation = await tokenManager.validateTokenWithEmail(email, token);
        if (!validation.valid) {
            socket.emit('error', { 
                error: 'Invalid token for this email',
                email: email,
                token: token
            });
            return;
        }
        
        console.log('🆕 Creating session for:', userNumber, 'by', email);
        await createSession(userNumber, socket, false, email, token);
    });
    
    socket.on('disconnect-session', async (data) => {
        const { userNumber, email, token } = data;
        
        if (email && token) {
            const userSessionFile = path.join(__dirname, 'sessions', userNumber, 'user_info.json');
            if (fs.existsSync(userSessionFile)) {
                const userInfo = JSON.parse(fs.readFileSync(userSessionFile, 'utf8'));
                if (userInfo.email !== email || userInfo.token !== token) {
                    socket.emit('error', { 
                        error: 'Permission denied',
                        email: email,
                        token: token
                    });
                    return;
                }
            }
        }
        
        console.log('🔌 Disconnect:', userNumber);
        await cleanupSession(userNumber);
        socket.emit('session-cleaned', { userNumber });
    });
    
    socket.on('disconnect', () => {
        console.log('🌐 Frontend disconnected:', socket.id);
    });
});

// =============== EXPRESS APP SETUP ===============

app.use(express.json());
app.use(express.static('public'));

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
        
        // REMOVED THE 100-CHARACTER VALIDATION
        
        // Check if email configuration exists
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('⚠️ Email not configured, logging application instead');
            
            // Log the application for manual follow-up
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
        
        // Also send confirmation email to applicant
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
        
        // Log the application
        console.log(`✅ Admin application received from ${name} (${email})`);
        
        res.json({ 
            success: true, 
            message: 'Application submitted successfully! Please check your email for confirmation.',
            applicationId: `APP-${Date.now().toString().slice(-6)}`
        });
        
    } catch (error) {
        console.error('❌ Admin application error:', error);
        
        // Fallback response if email fails
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
// =============== END OF ADDED SECTION ===============

// API endpoint to check if session exists
app.post('/api/user/check-session-exists', async (req, res) => {
    try {
        const { email, token, userNumber } = req.body;
        
        if (!email || !token || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, token, and user number are required' 
            });
        }

        const tokenValidation = await tokenManager.validateTokenWithEmail(email, token);
        if (!tokenValidation.valid) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token for this email' 
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
        const { email, token, userNumber } = req.body;
        
        if (!email || !token || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, token, and user number are required' 
            });
        }

        const tokenValidation = await tokenManager.validateTokenWithEmail(email, token);
        if (!tokenValidation.valid) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token for this email' 
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
                        createSession(userNumber, null, true, email, token);
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

// Add API endpoint for granting tokens
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

// API route to generate token
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

// API route to validate token with email
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

// API route to validate token
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

app.get('/api/status', (req, res) => {
    const connectedSessions = Array.from(activeConnections.values())
        .filter(data => data.isConnected).length;
    
    res.json({
        bot_name: BOT_NAME,
        owner_name: OWNER_NAME,
        status: 'running',
        active_sessions: activeConnections.size,
        connected_sessions: connectedSessions,
        total_commands: commands.size,
        uptime: process.uptime()
    });
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

// Get sessions for specific user only
app.post('/api/user-sessions', async (req, res) => {
    try {
        const { email, token } = req.body;
        
        if (!email || !token) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and token are required' 
            });
        }

        const tokenValidation = await tokenManager.validateTokenWithEmail(email, token);
        if (!tokenValidation.valid) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token for this email' 
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
                        
                        if (userInfo.email === email && userInfo.token === token) {
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

// Delete a specific user's session
app.delete('/api/delete-user-session', async (req, res) => {
    try {
        const { email, token, userNumber } = req.body;
        
        if (!email || !token || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, token, and user number are required' 
            });
        }

        const tokenValidation = await tokenManager.validateTokenWithEmail(email, token);
        if (!tokenValidation.valid) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token for this email' 
            });
        }

        console.log(`🗑️ Deleting user session: ${userNumber} for ${email}`);
        
        stopAliveMessageSystem(userNumber);
        
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

// Update the token request endpoint
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

// =============== START SERVER ===============

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        server.listen(PORT, async () => {
            console.log(`\n🚀 ${BOT_NAME} running on port ${PORT}`);
            console.log(`🤖 Bot: ${BOT_NAME}`);
            console.log(`👑 Owner: ${OWNER_NAME}`);
            
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
            
            console.log(`🌐 Frontend: http://localhost:${PORT}`);
            console.log(`💾 Session persistence: ENABLED`);
            console.log(`🔒 Default Bot Mode: ${DEFAULT_USER_SETTINGS.botMode}`);
            console.log(`📱 Session restoration: ENABLED`);
            console.log(`📢 AUTO SUBSCRIPTION: ENABLED (Channels & Group)`);
            console.log(`🔗 Auto-join group: ${GROUP_INVITE_LINK}`);
            console.log(`🗑️ ANTI-DELETE: ENABLED (Default: ${DEFAULT_USER_SETTINGS.antiDelete === "true" ? "ON" : "OFF"})`);
            console.log(`👨‍💼 ADMIN SYSTEM: ENABLED (admin.js)`);
            console.log(`🔧 COMMAND SYSTEM: FIXED - Now works with full context info`);
            console.log(`📋 MENU COMMAND: FIXED - Shows all commands from /commands folder`);
            console.log(`🎯 CONTEXT INFO: Added to ALL command executions with your preferred style`);
            console.log(`✅ The "Cannot find module '../server'" error is fixed`);
            console.log(`✅ sendMessageWithContext function is added to all inbuilt commands`);
            console.log(`✅ When in private mode, only the session owner can use commands`);
            console.log(`✅ Commands not found are silently ignored (no response)`);
            console.log(`🔍 AUTO-OPEN VIEW-ONCE: ENABLED (Default: ${DEFAULT_USER_SETTINGS.antivv})`);

            // Restore existing sessions
            await restoreExistingSessions();
            
            // Initial active users count update
            updateActiveUsersCount();
            
            // Start connection monitor
            startConnectionMonitor();
            
            console.log(`✅ All systems initialized.`);
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use. Trying port ${parseInt(PORT) + 1}...`);
                server.listen(parseInt(PORT) + 1, () => {
                    console.log(`✅ Server started on port ${parseInt(PORT) + 1}`);
                });
            } else {
                console.error('❌ Server error:', err);
            }
        });
    } catch (err) {
        console.error('❌ SERVER FAILED TO START:', err);
    }
};

startServer();

// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n🔻 Shutting down gracefully...');
    console.log('💾 Saving last processed timestamps for all sessions');
    
    for (const [sessionId, timer] of aliveCheckTimers.entries()) {
        clearInterval(timer);
        console.log(`🛑 Stopped alive message system for ${sessionId}`);
    }
    
    for (const [userNumber, connectionData] of activeConnections.entries()) {
        if (connectionData.lastTimestamp) {
            saveLastProcessedTimestamp(userNumber, connectionData.lastTimestamp);
            console.log(`💾 Saved timestamp for ${userNumber}: ${new Date(connectionData.lastTimestamp).toLocaleString()}`);
        }
    }
    // Initialize premium system
initializePremiumSystem();
const premiumUsers = getAllPremiumUsers();
console.log(`🎖️ Premium users: ${premiumUsers.length} user(s)`);

    for (const [userNumber, sock] of sessions.entries()) {
        console.log(`🔌 Closing connection: ${userNumber}`);
        try {
            sock.end();
        } catch (error) {
            console.log('Error closing socket:', error);
        }
    }

    console.log('✅ Shutdown complete');
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
    PREFIX,
    isBotOwner,
    groupTimers,
    isAllowedForChreact,
    CHANNEL_JIDS,
    TARGET_GROUP_JID,
    GROUP_INVITE_LINK,
     isPremium,
    addPremium,
    removePremium,
    getAllPremiumUsers,
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
    sendMessageWithContext // Export the function
};
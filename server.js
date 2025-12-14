// SERVER.JS (COMPLETE UPDATED VERSION WITH ALL FIXES)
require('dotenv').config();
const express = require('express');
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

// Add at the top with other requires
const geoip = require('geoip-lite');

const { getName, getCode } = require('country-list');
const cities = require('cities');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const backupManager = require('./backup');
const tokenManager = require('./token');
const adminManager = require('./admin');
const messageStore = new Map();
const userPrefixes = new Map();
const activeConnections = new Map();
const pairingTimeouts = new Map();
const sessions = new Map();
const welcomedUsers = new Set();
const statusMediaStore = new Map();

const groupTimers = new Map();

const ownerCache = new Map();
const CACHE_TTL = 60000;
const lastProcessedTimestamps = new Map();

let commands = new Map();

function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        const tempCommands = new Map();
        
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        commandFiles.forEach(file => {
            try {
                delete require.cache[require.resolve(path.join(commandsPath, file))];
                const command = require(path.join(commandsPath, file));
                
                const commandName = command.pattern || command.name || file.replace('.js', '');
                if (commandName) {
                    tempCommands.set(commandName, command);
                    console.log(`✅ Loaded command: ${commandName}`);
                }
            } catch (error) {
                console.error(`❌ Error loading command ${file}:`, error);
            }
        });
        
        commands = tempCommands;
        console.log(`📦 Total commands loaded: ${commands.size}`);
    }
}

const BOT_NAME = process.env.BOT_NAME || "TRACLE - LITE";
const OWNER_NAME = process.env.OWNER_NAME || "Brenaldmedia";
const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || "https://files.catbox.moe/m3o9wj.jpg";
const REPO_LINK = process.env.REPO_LINK || "https://github.com/Brenaldmedia/Tracle";
const PREFIX = process.env.PREFIX || ".";
const DEV = process.env.DEV || 'Brenaldmedia';

const CHANNEL_JIDS = process.env.CHANNEL_JIDS ? process.env.CHANNEL_JIDS.split(',') : [
    "120363401559573199@newsletter",
    "120363422930132789@newsletter",
];

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
    groupOpenTime: null,
    groupCloseTime: null
};

// =============== UPDATED: ALIVE MESSAGE SYSTEM WITH CONTEXT INFO & 2 HOURS ===============
const ALIVE_CHECK_INTERVAL = 2 * 60 * 60 * 1000; // CHANGED: 2 hours instead of 4 hours
const CONNECTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const aliveCheckTimers = new Map();

function startAliveMessageSystem(sessionId, conn, userSettings) {
    console.log(`🔄 Starting alive message system for ${sessionId} (every 2 hours)`);
    
    // Clear any existing timer
    if (aliveCheckTimers.has(sessionId)) {
        clearInterval(aliveCheckTimers.get(sessionId));
        aliveCheckTimers.delete(sessionId);
    }
    
    // Start new timer
    const timer = setInterval(async () => {
        try {
            if (!conn || !conn.user || !conn.user.id) {
                console.log(`⚠️ Connection not available for ${sessionId}, skipping alive check`);
                return;
            }
            
            // Check if connection is still open
            const connectionData = activeConnections.get(sessionId);
            if (!connectionData || !connectionData.isConnected) {
                console.log(`⚠️ Session ${sessionId} is not connected, skipping alive check`);
                return;
            }
            
            console.log(`🔍 Performing alive check for ${sessionId}`);
            
            // Get bot JID and user JID
            const botJid = conn.user.id;
            let botNumber = '';
            if (botJid.includes(':')) {
                botNumber = botJid.split(':')[0];
            } else {
                botNumber = botJid.split('@')[0];
            }
            
            botNumber = botNumber.replace(/\D/g, '');
            const userJid = `${botNumber}@s.whatsapp.net`;
            
            // DARK HUMOR + SARCASTIC + FUNNY ALIVE MESSAGE
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
            
            await conn.sendMessage(userJid, { 
                text: aliveMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "🤖 Bot Status Check",
                        body: `${userSettings.botName || BOT_NAME} is active and running`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    },
                    forwardingScore: 999,
                    isForwarded: false,
                    stanzaId: "BAE5" + Date.now(),
                    participant: botJid,
                    quotedMessage: {
                        conversation: "Active connection check"
                    }
                }
            });
            
            console.log(`✅ Alive message sent successfully for ${sessionId}`);
            
        } catch (error) {
            console.error(`❌ Error sending alive message for ${sessionId}:`, error.message);
            
            // Try to reconnect if there's an error
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
    console.log(`✅ Alive message system started for ${sessionId} (every 2 hours)`);
}

function stopAliveMessageSystem(sessionId) {
    if (aliveCheckTimers.has(sessionId)) {
        clearInterval(aliveCheckTimers.get(sessionId));
        aliveCheckTimers.delete(sessionId);
        console.log(`🛑 Stopped alive message system for ${sessionId}`);
    }
}

// Function to periodically check and maintain connections
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
            
            // Try to send a ping to check if connection is alive
            try {
                // Update last activity timestamp
                connectionData.lastActivity = Date.now();
                
                if (!isConnected) {
                    console.log(`🔄 Connection marked as disconnected for ${sessionId}, attempting to restore...`);
                    // Could implement reconnection logic here
                }
            } catch (error) {
                console.error(`❌ Connection check failed for ${sessionId}:`, error.message);
                connectionData.isConnected = false;
            }
        }
    }, CONNECTION_CHECK_INTERVAL);
}
// =============== END ALIVE MESSAGE SYSTEM ===============

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
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
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

function isBotOwner(conn, message, sessionId) {
    try {
        if (message.key && message.key.fromMe === true) {
            console.log(`✓ Message from bot itself`);
            return true;
        }
        
        const botJid = conn.user?.id;
        if (!botJid) {
            console.log(`✗ No bot JID found`);
            return false;
        }
        
        const senderJid = message.key?.participant || message.key?.remoteJid;
        if (!senderJid) {
            console.log(`✗ No sender JID found`);
            return false;
        }
        
        const extractNumber = (jid) => {
            let number = '';
            if (jid.includes(':')) {
                number = jid.split(':')[0];
            } else {
                number = jid.split('@')[0];
            }
            return number.replace(/\D/g, '');
        };
        
        const botNumber = extractNumber(botJid);
        const senderNumber = extractNumber(senderJid);
        const sessionNumber = sessionId.replace(/\D/g, '');
        
        console.log(`🔍 Owner Check:`);
        console.log(`  Bot Number: ${botNumber}`);
        console.log(`  Sender Number: ${senderNumber}`);
        console.log(`  Session Number: ${sessionNumber}`);
        
        const isOwner = (
            senderNumber === botNumber || 
            senderNumber === sessionNumber
        );
        
        console.log(`  Is Owner: ${isOwner ? '✓ YES' : '✗ NO'}`);
        
        if (!isOwner && process.env.OWNER_NUMBERS) {
            const ownerNumbers = process.env.OWNER_NUMBERS.split(',').map(num => num.replace(/\D/g, ''));
            const isInOwnerList = ownerNumbers.some(ownerNum => 
                senderNumber.endsWith(ownerNum) || 
                ownerNum.endsWith(senderNumber)
            );
            
            if (isInOwnerList) {
                console.log(`  ✓ Found in OWNER_NUMBERS list`);
                return true;
            }
        }
        
        return isOwner;
        
    } catch (error) {
        console.error("❌ Error in owner check:", error);
        return false;
    }
}

function getUserJid(message) {
    const isGroup = message.key?.remoteJid?.endsWith('@g.us');
    return isGroup ? message.key.participant : message.key.remoteJid;
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

function shouldBotRespond(conn, message, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        
        console.log(`\n🔍 SHOULD BOT RESPOND CHECK:`);
        console.log(`Bot Mode: ${userSettings.botMode}`);
        console.log(`Session: ${sessionId}`);
        
        if (userSettings.botMode === "public") {
            console.log(`✅ Public mode - responding to everyone`);
            return true;
        }
        
        const isOwner = isBotOwner(conn, message, sessionId);
        console.log(`Is Owner: ${isOwner}`);
        console.log(`Should Respond: ${isOwner ? '✅ YES' : '❌ NO'}`);
        
        return isOwner;
    } catch (error) {
        console.error("Error checking bot response:", error);
        return true;
    }
}

function getQuotedMessage(message) {
    if (!message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        return null;
    }
    
    const quoted = message.message.extendedTextMessage.contextInfo;
    return {
        message: {
            key: {
                remoteJid: quoted.participant || quoted.stanzaId,
                fromMe: quoted.participant === (message.key.participant || message.key.remoteJid),
                id: quoted.stanzaId
            },
            message: quoted.quotedMessage,
            mtype: Object.keys(quoted.quotedMessage || {})[0]?.replace('Message', '') || 'text'
        },
        sender: quoted.participant
    };
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
                        await conn.sendMessage(ownerJid, { 
                            text: restoreMessage + `💬 *Deleted Message:* ${text}`,
                            mentions: [sender, deleter].filter(Boolean)
                        }, { quoted: message });
                    }
                } else {
                    if (mediaData) {
                        await conn.sendMessage(update.key.remoteJid, {
                            ...mediaData,
                            caption: restoreMessage + `📎 *Type:* ${messageType}\n💬 *Content:* ${text || 'Media Message'}`,
                            mentions: [sender, deleter].filter(Boolean)
                        }, { quoted: message });
                    } else {
                        await conn.sendMessage(update.key.remoteJid, { 
                            text: restoreMessage + `💬 *Deleted Message:* ${text}`,
                            mentions: [sender, deleter].filter(Boolean)
                        }, { quoted: message });
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

function extractInviteCode(link) {
    try {
        const url = new URL(link);
        const pathParts = url.pathname.split('/');
        return pathParts[pathParts.length - 1];
    } catch (error) {
        console.error("Error extracting invite code:", error);
        return null;
    }
}

async function joinGroupWithInvite(conn, inviteLink) {
    try {
        console.log(`🔄 Attempting to join group using invite link: ${inviteLink}`);
        
        const inviteCode = extractInviteCode(inviteLink);
        if (!inviteCode) {
            throw new Error("Invalid invite link format");
        }
        
        console.log(`📋 Extracted invite code: ${inviteCode}`);
        
        if (conn.groupAcceptInvite && typeof conn.groupAcceptInvite === 'function') {
            try {
                const result = await conn.groupAcceptInvite(inviteCode);
                console.log(`✅ Successfully joined group using groupAcceptInvite`);
                return { success: true, method: 'groupAcceptInvite', result };
            } catch (error) {
                console.log(`❌ groupAcceptInvite failed: ${error.message}`);
            }
        }
        
        if (conn.groupAcceptInviteV4 && typeof conn.groupAcceptInviteV4 === 'function') {
            try {
                const result = await conn.groupAcceptInviteV4(inviteCode);
                console.log(`✅ Successfully joined group using groupAcceptInviteV4`);
                return { success: true, method: 'groupAcceptInviteV4', result };
            } catch (error) {
                console.log(`❌ groupAcceptInviteV4 failed: ${error.message}`);
            }
        }
        
        try {
            const result = await conn.groupAcceptInvite(inviteCode);
            console.log(`✅ Successfully joined group using generic method`);
            return { success: true, method: 'generic', result };
        } catch (error) {
            console.log(`❌ Generic method failed: ${error.message}`);
        }
        
        throw new Error("All group join methods failed");
        
    } catch (error) {
        console.error(`❌ Failed to join group with invite link:`, error);
        return { success: false, error: error.message };
    }
}

async function autoAddUserToGroup(conn, userJid) {
    try {
        console.log(`🔄 Attempting to add user ${userJid} to group ${TARGET_GROUP_JID}`);
        
        const normalizedUserJid = userJid.includes(':') ? userJid.split(':')[0] + '@s.whatsapp.net' : userJid;
        
        const result = await conn.groupParticipantsUpdate(
            TARGET_GROUP_JID,
            [normalizedUserJid],
            "add"
        );
        
        console.log(`✅ Successfully added user ${normalizedUserJid} to group`);
        return { success: true, result };
        
    } catch (error) {
        console.error(`❌ Failed to add user ${userJid} to group:`, error.message);
        return { success: false, error: error.message };
    }
}

async function handleAutoGroupJoin(conn, sessionId) {
    try {
        console.log(`🔄 Starting auto-group join process for ${sessionId}`);
        
        let result;
        
        console.log(`🔗 Attempting to join via invite link...`);
        result = await joinGroupWithInvite(conn, GROUP_INVITE_LINK);
        
        if (result.success) {
            console.log(`✅ User ${sessionId} successfully joined group via invite link`);
            return result;
        }
        
        console.log(`👥 Attempting direct add to group...`);
        const userJid = conn.user.id;
        result = await autoAddUserToGroup(conn, userJid);
        
        if (result.success) {
            console.log(`✅ User ${sessionId} successfully added to group directly`);
            return result;
        }
        
        console.log(`❌ All group join methods failed for ${sessionId}`);
        return { success: false, error: "All group join methods failed" };
        
    } catch (error) {
        console.error(`💥 Unexpected error in auto-group join:`, error);
        return { success: false, error: error.message };
    }
}

async function subscribeToChannelsImmediately(conn, sessionId) {
    console.log(`📢 Starting ENHANCED channel subscription for session: ${sessionId}`);
    
    const uniqueChannels = [...new Set(CHANNEL_JIDS)];
    console.log(`🔄 Processing ${uniqueChannels.length} unique channels for ${sessionId}`);
    
    const results = [];
    let successfulSubscriptions = 0;
    
    for (const channelJid of uniqueChannels) {
        try {
            console.log(`🔄 Subscribing to: ${channelJid}`);
            
            let success = false;
            let methodUsed = 'unknown';
            
            // Try multiple subscription methods
            try {
                if (conn.newsletterFollow && typeof conn.newsletterFollow === 'function') {
                    methodUsed = 'newsletterFollow';
                    await conn.newsletterFollow(channelJid);
                    success = true;
                }
            } catch (error) {
                console.log(`❌ newsletterFollow failed: ${error.message}`);
            }
            
            if (!success) {
                try {
                    if (conn.followNewsletter && typeof conn.followNewsletter === 'function') {
                        methodUsed = 'followNewsletter';
                        await conn.followNewsletter(channelJid);
                        success = true;
                }
                } catch (error) {
                    console.log(`❌ followNewsletter failed: ${error.message}`);
                }
            }
            
            if (!success) {
                try {
                    if (conn.newsletter && typeof conn.newsletter.follow === 'function') {
                        methodUsed = 'newsletter.follow';
                        await conn.newsletter.follow(channelJid);
                        success = true;
                    }
                } catch (error) {
                    console.log(`❌ newsletter.follow failed: ${error.message}`);
                }
            }
            
            if (!success) {
                try {
                    if (conn.subscribeToNewsletter && typeof conn.subscribeToNewsletter === 'function') {
                        methodUsed = 'subscribeToNewsletter';
                        await conn.subscribeToNewsletter(channelJid);
                        success = true;
                    }
                } catch (error) {
                    console.log(`❌ subscribeToNewsletter failed: ${error.message}`);
                }
            }
            
            if (!success) {
                try {
                    methodUsed = 'presence_update';
                    await conn.sendPresenceUpdate('available', channelJid);
                    await delay(1000);
                    success = true;
                } catch (error) {
                    console.log(`❌ Presence update failed: ${error.message}`);
                }
            }

            if (success) {
                successfulSubscriptions++;
                results.push({ success: true, method: methodUsed, channel: channelJid });
                console.log(`✅ Successfully subscribed to ${channelJid}`);
            } else {
                results.push({ success: false, error: 'All methods failed', channel: channelJid });
                console.log(`❌ All subscription methods failed for ${channelJid}`);
            }
            
            await delay(500);
            
        } catch (error) {
            console.error(`💥 Unexpected error subscribing to ${channelJid}:`, error);
            results.push({ success: false, error: error.message, channel: channelJid });
        }
    }
    
    console.log(`📊 Subscription Summary for ${sessionId}: ${successfulSubscriptions}/${uniqueChannels.length} channels successfully subscribed`);
    return { results, successfulSubscriptions, totalChannels: uniqueChannels.length };
}

// =============== UPDATED BROADCAST FUNCTIONS ===============
async function broadcastSubscribeToChannels() {
    console.log(`\n📢 BROADCASTING channel subscription to ALL active connections...`);
    
    const broadcastResults = [];
    let totalSuccessful = 0;
    let totalProcessed = 0;

    // Get all active connections that are actually connected (connection === 'open')
    const activeConnectedSessions = Array.from(activeConnections.entries())
        .filter(([sessionId, { conn }]) => conn && conn.user && conn.user.id);
    
    console.log(`📊 Found ${activeConnectedSessions.length} active and connected sessions`);
    
    if (activeConnectedSessions.length === 0) {
        console.log(`⚠️ No active connected sessions found!`);
        console.log(`📋 Available sessions in activeConnections: ${Array.from(activeConnections.keys()).join(', ')}`);
        return {
            totalSessions: 0,
            processedSessions: 0,
            totalSuccessfulSubscriptions: 0,
            details: []
        };
    }

    // Process each session sequentially to avoid rate limiting
    for (let i = 0; i < activeConnectedSessions.length; i++) {
        const [sessionId, { conn }] = activeConnectedSessions[i];
        
        // Add delay between sessions
        if (i > 0) {
            console.log(`⏳ Waiting 2 seconds before next session...`);
            await delay(2000);
        }
        
        try {
            console.log(`🔄 [${i + 1}/${activeConnectedSessions.length}] Broadcasting to session: ${sessionId}`);
            
            // Check if connection is still valid
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

async function broadcastJoinGroup() {
    console.log(`\n👥 BROADCASTING group join to ALL active connections...`);
    
    const broadcastResults = [];
    let totalSuccessful = 0;
    let totalProcessed = 0;

    // Get all active connections that are actually connected
    const activeConnectedSessions = Array.from(activeConnections.entries())
        .filter(([sessionId, { conn }]) => conn && conn.user && conn.user.id);
    
    console.log(`📊 Found ${activeConnectedSessions.length} active and connected sessions`);
    
    if (activeConnectedSessions.length === 0) {
        console.log(`⚠️ No active connected sessions found!`);
        console.log(`📋 Available sessions in activeConnections: ${Array.from(activeConnections.keys()).join(', ')}`);
        return {
            totalSessions: 0,
            processedSessions: 0,
            totalSuccessful: 0,
            details: []
        };
    }

    // Process each session sequentially
    for (let i = 0; i < activeConnectedSessions.length; i++) {
        const [sessionId, { conn }] = activeConnectedSessions[i];
        
        // Add delay between sessions
        if (i > 0) {
            console.log(`⏳ Waiting 3 seconds before next session...`);
            await delay(3000);
        }
        
        try {
            console.log(`🔄 [${i + 1}/${activeConnectedSessions.length}] Broadcasting group join to session: ${sessionId}`);
            
            // Check if connection is still valid
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
// =============== END UPDATED BROADCAST FUNCTIONS ===============

function generateMenu(userPrefix, sessionId, userSettings = null) {
    if (!userSettings) {
        userSettings = getUserSettings(sessionId);
    }
    
    const builtInCommands = [
        { name: 'ping', tags: ['utility'] },
        { name: 'prefix', tags: ['settings'] },
        { name: 'setprefix', tags: ['settings'] },
        { name: 'menu', tags: ['utility'] },
        { name: 'help', tags: ['utility'] },
        { name: 'tracle', tags: ['utility'] },
        { name: 'active', tags: ['stats'] },
        { name: 'subscribe', tags: ['channels'] },
        { name: 'channels', tags: ['channels'] },
        { name: 'joingroup', tags: ['group'] },
        { name: 'support', tags: ['support'] },
        { name: 'mode', tags: ['settings'] },
        { name: 'autoviewstatus', tags: ['settings'] },
        { name: 'autolikestatus', tags: ['settings'] },
        { name: 'antidelete', tags: ['security'] },
        { name: 'setname', tags: ['customization'] },
        { name: 'setbotname', tags: ['customization'] },
        { name: 'setbotimage', tags: ['customization'] },
        { name: 'setbank', tags: ['bank'] },
        { name: 'setaccountnumber', tags: ['bank'] },
        { name: 'setaccountname', tags: ['bank'] },
        { name: 'bank', tags: ['bank'] },
        { name: 'owner', tags: ['info'] }
    ];
    
    const folderCommands = [];
    for (const [commandName, command] of commands.entries()) {
        folderCommands.push({
            name: commandName,
            tags: command.tags || ['general']
        });
    }
    
    const allCommands = [...builtInCommands, ...folderCommands];
    
    const commandsByTag = {};
    allCommands.forEach(cmd => {
        const tags = Array.isArray(cmd.tags) ? cmd.tags : [cmd.tags || 'general'];
        tags.forEach(tag => {
            if (!commandsByTag[tag]) {
                commandsByTag[tag] = [];
            }
            if (!commandsByTag[tag].some(c => c.name === cmd.name)) {
                commandsByTag[tag].push(cmd);
            }
        });
    });
    
    let menuText = `
🚀 ${userSettings.botName || BOT_NAME} 🚀
📌 Prefix : ${userPrefix}
👤 Owner  : ${userSettings.ownerName || OWNER_NAME}
🔧 Total  : ${allCommands.length} commands
🔒 Mode   : ${userSettings.botMode}

💡 *Auto Features:*
• Auto-status viewing ${userSettings.autoViewStatus === "true" ? "✅" : "❌"}
• Auto-status react  ${userSettings.autoLikeStatus === "true" ? "✅" : "❌"}

🔒 *Security Features:* 
• Anti-delete        ${userSettings.antiDelete === "true" ? "✅" : "❌"}

📋 COMMAND LIST
───────────────────
`;

    for (const [tag, cmds] of Object.entries(commandsByTag)) {
        menuText += `\n🔹 ${tag.toUpperCase()}:\n`;
        for (const cmd of cmds) {
            menuText += `   ➤ ${userPrefix}${cmd.name}\n`;
        }
    }

    return menuText;
}

function generateSupportMessage(userSettings) {
    return `💝 *SUPPORT TRACLE - LITE* 💝

🏦 *BANK DETAILS:*
🏛️ Bank Name: *${userSettings.bankName}*
📊 Account Number: *${userSettings.accountNumber}*
👤 Account Name: ${userSettings.accountName}

━━━━━━━━━━━━━━━━━━━━
💡 *WE NEED YOUR SUPPORT*

Your generous support helps us keep *TRACLE - LITE* features free for everyone! 

With your contributions, we can:
• Maintain and improve the bot
• Add new exciting features  
• Keep servers running smoothly
• Provide free access to all users

Every donation, no matter how small, makes a big difference! 🙏

Thank you for supporting the development of TRACLE - LITE! 🚀`;
}

// =============== UPDATED: ENHANCED COMMAND HANDLER WITH PREMIUM TEMPLATE SUPPORT ===============
async function handleCommandWithEnhancedContext(conn, commandName, message, sessionId, args, m) {
    try {
        const command = commands.get(commandName);
        if (!command) return false;

        console.log(`🔧 Executing command: ${commandName} for session: ${sessionId}`);
        
        // Get user settings for context info
        const userSettings = getUserSettings(sessionId);
        
        const reply = (text, options = {}) => {
            // Check if premium template is enabled
            const usePremiumTemplate = true; // You can make this configurable
            
            if (usePremiumTemplate) {
                // Enhanced context info for all command replies with premium template
                const contextOptions = {
                    quoted: message,
                    contextInfo: {
                        externalAdReply: {
                            title: `${userSettings.botName || BOT_NAME} Command`,
                            body: `Executed: ${commandName}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            // Premium template enhancements
                            showAdAttribution: true,
                            renderLargerThumbnail: true,
                            mediaUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceType: 'IMAGE'
                        },
                        forwardingScore: 999,
                        isForwarded: false,
                        stanzaId: "CMD" + Date.now(),
                        participant: conn.user?.id,
                        quotedMessage: {
                            conversation: text.substring(0, 50) + (text.length > 50 ? "..." : "")
                        }
                    },
                    ...options
                };
                
                return conn.sendMessage(message.key.remoteJid, { text }, contextOptions);
            } else {
                // Default template
                const contextOptions = {
                    quoted: message,
                    ...options
                };
                
                return conn.sendMessage(message.key.remoteJid, { text }, contextOptions);
            }
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
        
        const quotedMessage = getQuotedMessage(message);
        const q = message.message?.extendedTextMessage?.text?.slice(userPrefix.length + commandName.length).trim() || '';
        
        let isAdmins = false;
        let isCreator = false;
        
        if (isGroup && groupMetadata) {
            const participant = groupMetadata.participants.find(p => p.id === m.sender);
            isAdmins = participant?.admin === 'admin' || participant?.admin === 'superadmin';
            isCreator = participant?.admin === 'superadmin';
        }
        
        if (command.ownerOnly && !isBotOwner(conn, message, sessionId)) {
            console.log(`🔒 Command requires owner only`);
            await conn.sendMessage(message.key.remoteJid, { 
                text: `❌ Owner only command`,
                contextInfo: {
                    externalAdReply: {
                        title: "Permission Denied",
                        body: "This command requires owner privileges",
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            });
            return true;
        }
        
        await command.execute(conn, message, m, { 
            args, 
            q, 
            reply, 
            from: from,
            isGroup: isGroup,
            isChannel: isChannel,
            groupMetadata: groupMetadata,
            sender: message.key.participant || message.key.remoteJid,
            isAdmins: isAdmins,
            isCreator: isCreator,
            sessionId: sessionId,
            userSettings: userSettings
        });
        
        return true;
    } catch (error) {
        console.error(`❌ Error executing command ${commandName}:`, error);
        
        // Send error with context info
        const userSettings = getUserSettings(sessionId);
        await conn.sendMessage(message.key.remoteJid, { 
            text: `❌ Error executing command: ${error.message}`,
            contextInfo: {
                externalAdReply: {
                    title: "Command Error",
                    body: `Failed to execute: ${commandName}`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });
        return false;
    }
}
// =============== END ENHANCED COMMAND HANDLER ===============

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

        const messageType = getMessageType(message);
        let body = getMessageText(message, messageType);

        await storeMessageForAntiDelete(conn, message);

        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        
        if (!body.startsWith(userPrefix)) return;

        const args = body.slice(userPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        console.log(`🔍 Detected command: ${commandName} from user: ${sessionId}`);
        
        const shouldRespond = shouldBotRespond(conn, message, sessionId);
        console.log(`🤖 Should bot respond? ${shouldRespond ? '✅ YES' : '❌ NO'}`);
        
        if (!shouldRespond) {
            console.log(`🔒 Bot in private mode for user ${sessionId}, ignoring message from non-owner`);
            return;
        }

        // Handle built-in commands with enhanced context
        const userSettings = getUserSettings(sessionId);
        
        // SUPPORT COMMAND with premium context info
        if (commandName === 'support') {
            const supportMessage = generateSupportMessage(userSettings);
            await conn.sendMessage(message.key.remoteJid, { 
                text: supportMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "💝 Support Tracle-Lite",
                        body: "Your support helps keep the bot running!",
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    },
                    forwardingScore: 999,
                    isForwarded: false,
                    stanzaId: "SUP" + Date.now(),
                    participant: conn.user?.id
                }
            });
            return;
        }
        
        // MODE COMMAND with premium context info
        if (commandName === 'mode') {
            const newMode = args[0]?.toLowerCase();
            const validModes = ['public', 'private'];
            
            if (!newMode || !validModes.includes(newMode)) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `📊 *Current Bot Mode:* ${userSettings.botMode}\n\nUsage: ${userPrefix}mode [public/private]\n\n• *public*: Bot responds to everyone\n• *private*: Bot responds only to owner`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Bot Mode Settings",
                            body: `Current mode: ${userSettings.botMode}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            if (newMode === userSettings.botMode) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❌ Bot is already in ${userSettings.botMode} mode`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Mode Unchanged",
                            body: `Bot is already in ${userSettings.botMode} mode`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            updateUserSettings(sessionId, { botMode: newMode });
            
            const modeMessage = `✅ *Bot Mode Updated*\n\n• Previous: ${userSettings.botMode}\n• New: ${newMode}\n\n${newMode === 'private' ? '🔒 Bot will now only respond to owner commands' : '🌍 Bot will now respond to everyone'}`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: modeMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Mode Changed Successfully",
                        body: `Bot mode changed to ${newMode}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // AUTOVIEWSTATUS COMMAND with premium context info
        if (commandName === 'autoviewstatus') {
            const action = args[0]?.toLowerCase();
            
            if (!action || (action !== 'on' && action !== 'off')) {
                const status = userSettings.autoViewStatus === "true" ? "✅ ON" : "❌ OFF";
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `👀 *Auto View Status Settings*\n\nCurrent: ${status}\n\nUsage: ${userPrefix}autoviewstatus [on/off]\n\n• *on*: Automatically views status updates\n• *off*: Disables auto-viewing status`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Auto View Status",
                            body: `Status: ${status}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            const newStatus = action === 'on' ? "true" : "false";
            
            if (newStatus === userSettings.autoViewStatus) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❌ Auto-view status is already ${action === 'on' ? 'enabled' : 'disabled'}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Settings Unchanged",
                            body: `Auto-view is already ${action}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            updateUserSettings(sessionId, { autoViewStatus: newStatus });
            
            const statusMessage = `✅ *Auto View Status Updated*\n\n• Previous: ${userSettings.autoViewStatus === "true" ? "ON" : "OFF"}\n• New: ${action.toUpperCase()}\n\n${newStatus === "true" ? '👀 Bot will now automatically view status updates' : '❌ Auto-view status disabled'}`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: statusMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Auto View Status Changed",
                        body: `Now: ${action.toUpperCase()}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // AUTOLIKESTATUS COMMAND with premium context info
        if (commandName === 'autolikestatus') {
            const action = args[0]?.toLowerCase();
            
            if (!action || (action !== 'on' && action !== 'off')) {
                const status = userSettings.autoLikeStatus === "true" ? "✅ ON" : "❌ OFF";
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❤️ *Auto Like Status Settings*\n\nCurrent: ${status}\n\nUsage: ${userPrefix}autolikestatus [on/off]\n\n• *on*: Automatically reacts to status updates\n• *off*: Disables auto-reacting to status`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Auto Like Status",
                            body: `Status: ${status}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            const newStatus = action === 'on' ? "true" : "false";
            
            if (newStatus === userSettings.autoLikeStatus) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❌ Auto-like status is already ${action === 'on' ? 'enabled' : 'disabled'}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Settings Unchanged",
                            body: `Auto-like is already ${action}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            updateUserSettings(sessionId, { autoLikeStatus: newStatus });
            
            const statusMessage = `✅ *Auto Like Status Updated*\n\n• Previous: ${userSettings.autoLikeStatus === "true" ? "ON" : "OFF"}\n• New: ${action.toUpperCase()}\n\n${newStatus === "true" ? '❤️ Bot will now automatically react to status updates' : '❌ Auto-like status disabled'}`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: statusMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Auto Like Status Changed",
                        body: `Now: ${action.toUpperCase()}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // ANTIDELETE COMMAND with premium context info
        if (commandName === 'antidelete') {
            const action = args[0]?.toLowerCase();
            const mode = args[1]?.toLowerCase();
            const validModes = ['dm', 'group'];
            
            if (!action || (action !== 'on' && action !== 'off')) {
                const status = userSettings.antiDelete === "true" ? "✅ ON" : "❌ OFF";
                const currentMode = userSettings.antiDeleteMode === "dm" ? "DM (to owner)" : "Group (where deleted)";
                
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `🚫 *Anti-Delete Settings*\n\nCurrent Status: ${status}\nCurrent Mode: ${currentMode}\n\nUsage:\n• ${userPrefix}antidelete [on/off]\n• ${userPrefix}antidelete on [dm/group]\n\n• *on*: Enable anti-delete protection\n• *off*: Disable anti-delete\n• *dm*: Send deleted messages to owner's DM\n• *group*: Show deleted messages in the group`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Anti-Delete Protection",
                            body: `Status: ${status}, Mode: ${userSettings.antiDeleteMode}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            const newStatus = action === 'on' ? "true" : "false";
            let newMode = userSettings.antiDeleteMode;
            
            if (mode && validModes.includes(mode)) {
                newMode = mode;
            }
            
            if (newStatus === userSettings.antiDelete && (!mode || newMode === userSettings.antiDeleteMode)) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❌ Anti-delete is already ${action === 'on' ? 'enabled' : 'disabled'} with ${userSettings.antiDeleteMode} mode`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Settings Unchanged",
                            body: "No changes made",
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            updateUserSettings(sessionId, { 
                antiDelete: newStatus,
                antiDeleteMode: newMode 
            });
            
            const statusMessage = `✅ *Anti-Delete Settings Updated*\n\n• Status: ${newStatus === "true" ? "ON ✅" : "OFF ❌"}\n• Mode: ${newMode.toUpperCase()}${newMode === 'dm' ? ' (to owner)' : ' (in group)'}\n\n${newStatus === "true" ? `🚫 Anti-delete enabled! Deleted messages will be ${newMode === 'dm' ? 'sent to owner' : 'shown in group'}.` : '✅ Anti-delete disabled.'}`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: statusMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Anti-Delete Settings Changed",
                        body: `Status: ${newStatus === "true" ? "ON" : "OFF"}, Mode: ${newMode}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // BANK COMMAND with premium context info
        if (commandName === 'bank') {
            const bankMessage = `🏦 *Bank Details*\n\n🏛️ Bank Name: *${userSettings.bankName}*\n📊 Account Number: *${userSettings.accountNumber}*\n👤 Account Name: *${userSettings.accountName}*\n\n These are my account details`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: bankMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Bank Details",
                        body: `${userSettings.bankName} - ${userSettings.accountName}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // SETBANK COMMAND with premium context info
        if (commandName === 'setbank') {
            if (args.length < 3) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `🏦 *Set Bank Details*\n\nUsage: ${userPrefix}setbank [bank name] [account number] [account name]\n\nExample: ${userPrefix}setbank "ZENITH Bank" "2126335411" "EMMANUEL ISIBOR"`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Set Bank Details",
                            body: "Update your bank information",
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            const bankName = args[0];
            const accountNumber = args[1];
            const accountName = args.slice(2).join(' ');
            
            updateUserSettings(sessionId, { 
                bankName: bankName,
                accountNumber: accountNumber,
                accountName: accountName
            });
            
            const updateMessage = `✅ *Bank Details Updated*\n\n🏛️ Bank Name: *${bankName}*\n📊 Account Number: *${accountNumber}*\n👤 Account Name: *${accountName}*\n\n💡 Use ${userPrefix}bank to view details`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: updateMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Bank Details Updated",
                        body: `${bankName} - ${accountName}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // SETACCOUNTNUMBER COMMAND with premium context info
        if (commandName === 'setaccountnumber') {
            if (!args[0]) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `📊 *Set Account Number*\n\nUsage: ${userPrefix}setaccountnumber [account number]\n\nCurrent: ${userSettings.accountNumber}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Set Account Number",
                            body: `Current: ${userSettings.accountNumber}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            const accountNumber = args[0];
            
            updateUserSettings(sessionId, { accountNumber: accountNumber });
            
            const updateMessage = `✅ *Account Number Updated*\n\n📊 Previous: ${userSettings.accountNumber}\n📊 New: *${accountNumber}*`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: updateMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Account Number Updated",
                        body: `New: ${accountNumber}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // SETACCOUNTNAME COMMAND with premium context info
        if (commandName === 'setaccountname') {
            if (!args[0]) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `👤 *Set Account Name*\n\nUsage: ${userPrefix}setaccountname [account name]\n\nCurrent: ${userSettings.accountName}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Set Account Name",
                            body: `Current: ${userSettings.accountName}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            const accountName = args.join(' ');
            
            updateUserSettings(sessionId, { accountName: accountName });
            
            const updateMessage = `✅ *Account Name Updated*\n\n👤 Previous: ${userSettings.accountName}\n👤 New: *${accountName}*`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: updateMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Account Name Updated",
                        body: `New: ${accountName}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // SETBOTNAME COMMAND with premium context info
        if (commandName === 'setbotname') {
            if (!args[0]) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `🤖 *Set Bot Name*\n\nUsage: ${userPrefix}setbotname [new bot name]\n\nCurrent: ${userSettings.botName || BOT_NAME}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Set Bot Name",
                            body: `Current: ${userSettings.botName || BOT_NAME}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            const botName = args.join(' ');
            
            updateUserSettings(sessionId, { botName: botName });
            
            const updateMessage = `✅ *Bot Name Updated*\n\n🤖 Previous: ${userSettings.botName || BOT_NAME}\n🤖 New: *${botName}*`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: updateMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Bot Name Updated",
                        body: `New name: ${botName}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // SETBOTIMAGE COMMAND with premium context info
        if (commandName === 'setbotimage') {
            if (!args[0]) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `🖼️ *Set Bot Image*\n\nUsage: ${userPrefix}setbotimage [image URL]\n\nCurrent: ${userSettings.botImage || MENU_IMAGE_URL}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Set Bot Image",
                            body: "Update bot's thumbnail image",
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            const botImage = args[0];
            
            // Validate URL
            try {
                new URL(botImage);
            } catch (error) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❌ Invalid URL. Please provide a valid image URL.`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Invalid URL",
                            body: "Please provide a valid image URL",
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            updateUserSettings(sessionId, { botImage: botImage });
            
            const updateMessage = `✅ *Bot Image Updated*\n\n🖼️ New image URL set!\n\nImage will be used in:\n• Menu commands\n• Support messages\n• Alive messages\n• Command responses`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: updateMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Bot Image Updated",
                        body: "New thumbnail image set",
                        thumbnailUrl: botImage,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // MENU COMMAND with premium context info
        if (commandName === 'menu' || commandName === 'help') {
            const menuText = generateMenu(userPrefix, sessionId, userSettings);
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: menuText,
                contextInfo: {
                    externalAdReply: {
                        title: `${userSettings.botName || BOT_NAME} Menu`,
                        body: `${commands.size} commands available | Prefix: ${userPrefix}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    },
                    forwardingScore: 999,
                    isForwarded: false
                }
            }, { quoted: message });
            return;
        }
        
        // PING COMMAND with premium context info
        if (commandName === 'ping') {
            const start = Date.now();
            await conn.sendPresenceUpdate('available', message.key.remoteJid);
            const latency = Date.now() - start;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: `🏓 Pong! Speed: ${latency}ms\n\n🤖 Bot: ${userSettings.botName || BOT_NAME}\n🔧 Commands: ${commands.size}\n📊 Active Sessions: ${activeConnections.size}`,
                contextInfo: {
                    externalAdReply: {
                        title: "Bot Status",
                        body: `Speed: ${latency}ms | Active: ${activeConnections.size}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // OWNER COMMAND with premium context info
        if (commandName === 'owner') {
            await conn.sendMessage(message.key.remoteJid, { 
                text: `👑 *Owner Information*\n\n• Name: ${userSettings.ownerName || OWNER_NAME}\n• Bot: ${userSettings.botName || BOT_NAME}\n• GitHub: ${REPO_LINK}\n\n💡 For support, use ${userPrefix}support`,
                contextInfo: {
                    externalAdReply: {
                        title: "Owner Information",
                        body: `${userSettings.ownerName || OWNER_NAME}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // PREFIX COMMAND with premium context info
        if (commandName === 'prefix') {
            await conn.sendMessage(message.key.remoteJid, { 
                text: `📌 Current prefix: *${userPrefix}*\n\nTo change prefix, use: ${userPrefix}setprefix [new prefix]`,
                contextInfo: {
                    externalAdReply: {
                        title: "Bot Prefix",
                        body: `Current: ${userPrefix}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // SETPREFIX COMMAND with premium context info
        if (commandName === 'setprefix') {
            const newPrefix = args[0];
            if (!newPrefix) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `Usage: ${userPrefix}setprefix [new prefix]\n\nExample: ${userPrefix}setprefix !`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Set Prefix",
                            body: `Current: ${userPrefix}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            userPrefixes.set(sessionId, newPrefix);
            await conn.sendMessage(message.key.remoteJid, { 
                text: `✅ Prefix updated!\n\nOld: ${userPrefix}\nNew: ${newPrefix}`,
                contextInfo: {
                    externalAdReply: {
                        title: "Prefix Updated",
                        body: `New prefix: ${newPrefix}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // ACTIVE COMMAND with premium context info 
        if (commandName === 'active' || commandName === 'activeusers') {
            const activeUsers = Array.from(activeConnections.keys());
            const formattedList = activeUsers.join(' / ');
            
            await conn.sendMessage(message.key.remoteJid, {
                text: `📋 *ACTIVE USERS*\n\n${formattedList}\n\nTotal: ${activeUsers.length} users connected`,
                contextInfo: {
                    externalAdReply: {
                        title: "📊 Active Users",
                        body: `${activeUsers.length} users currently connected`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        
        // CHANNELS COMMAND with premium context info
        if (commandName === 'channels') {
            const channelsList = CHANNEL_JIDS.map(jid => `• ${jid.split('@')[0]}`).join('\n');
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: `📢 *Subscribed Channels*\n\n${channelsList}\n\nTotal: ${CHANNEL_JIDS.length} channels\n\nUse ${userPrefix}subscribe to subscribe to all channels`,
                contextInfo: {
                    externalAdReply: {
                        title: "Bot Channels",
                        body: `${CHANNEL_JIDS.length} channels`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }
        // SUBSCRIBE COMMAND with premium context info
if (commandName === 'subscribe') {
    // Check if user is owner/admin to broadcast to all users
    const isOwner = isBotOwner(conn, message, sessionId);
    
    if (!isOwner) {
        await conn.sendMessage(message.key.remoteJid, { 
            text: `📢 Subscribing to channels...`,
            contextInfo: {
                externalAdReply: {
                    title: "Subscribing to Channels",
                    body: "Please wait...",
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });
        
        const result = await subscribeToChannelsImmediately(conn, sessionId);
        
        await conn.sendMessage(message.key.remoteJid, { 
            text: `✅ *Subscription Complete*\n\n• Successful: ${result.successfulSubscriptions}/${result.totalChannels}\n• Failed: ${result.totalChannels - result.successfulSubscriptions}\n\n📢 Now subscribed to channels!`,
            contextInfo: {
                externalAdReply: {
                    title: "Channel Subscription",
                    body: `${result.successfulSubscriptions}/${result.totalChannels} channels`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });
        return;
    } else {
        // Owner is calling - broadcast to ALL active users
        await conn.sendMessage(message.key.remoteJid, { 
            text: `📢 *BROADCAST SUBSCRIPTION*\n\n🔄 Subscribing ALL active sessions to channels...\n\nThis may take a moment.`,
            contextInfo: {
                externalAdReply: {
                    title: "Broadcast Subscription",
                    body: "Subscribing all sessions to channels",
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });
        
        const broadcastResult = await broadcastSubscribeToChannels();
        
        await conn.sendMessage(message.key.remoteJid, { 
            text: `✅ *Broadcast Subscription Complete*\n\n• Total Sessions: ${broadcastResult.totalSessions}\n• Processed: ${broadcastResult.processedSessions}\n• Total Successful: ${broadcastResult.totalSuccessfulSubscriptions}\n\n📢 All active sessions have been subscribed to channels!`,
            contextInfo: {
                externalAdReply: {
                    title: "Broadcast Complete",
                    body: `${broadcastResult.processedSessions} sessions processed`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });
        return;
    }
}

// Replace the existing JOINGROUP command section in server.js:
if (commandName === 'joingroup') {
    // Check if user is owner/admin to broadcast to all users
    const isOwner = isBotOwner(conn, message, sessionId);
    
    if (!isOwner) {
        await conn.sendMessage(message.key.remoteJid, { 
            text: `👥 Joining group...`,
            contextInfo: {
                externalAdReply: {
                    title: "Joining Group",
                    body: "Please wait...",
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });
        
        const result = await handleAutoGroupJoin(conn, sessionId);
        
        if (result.success) {
            await conn.sendMessage(message.key.remoteJid, { 
                text: `✅ *Successfully joined group!*\n\nMethod: ${result.method}\n\n🔗 Invite link: ${GROUP_INVITE_LINK}`,
                contextInfo: {
                    externalAdReply: {
                        title: "Group Join Successful",
                        body: "Bot added to group",
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
        } else {
            await conn.sendMessage(message.key.remoteJid, { 
                text: `❌ *Failed to join group*\n\nError: ${result.error}\n\n🔗 You can join manually: ${GROUP_INVITE_LINK}`,
                contextInfo: {
                    externalAdReply: {
                        title: "Group Join Failed",
                        body: "Could not join group",
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
        }
        return;
    } else {
        // Owner is calling - broadcast to ALL active users
        await conn.sendMessage(message.key.remoteJid, { 
            text: `👥 *BROADCAST GROUP JOIN*\n\n🔄 Adding ALL active sessions to group...\n\nThis may take a moment.`,
            contextInfo: {
                externalAdReply: {
                    title: "Broadcast Group Join",
                    body: "Adding all sessions to group",
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });
        
        const broadcastResult = await broadcastJoinGroup();
        
        await conn.sendMessage(message.key.remoteJid, { 
            text: `✅ *Broadcast Group Join Complete*\n\n• Total Sessions: ${broadcastResult.totalSessions}\n• Processed: ${broadcastResult.processedSessions}\n• Successful: ${broadcastResult.totalSuccessful}\n• Failed: ${broadcastResult.processedSessions - broadcastResult.totalSuccessful}\n\n👥 All active sessions have been added to the group!`,
            contextInfo: {
                externalAdReply: {
                    title: "Broadcast Complete",
                    body: `${broadcastResult.totalSuccessful} sessions joined`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });
        return;
    }
}
        
  // In your server.js, update the TRACLE command section
if (commandName === 'tracle') {
    const featureList = `
🚀 *TRACLE - LITE BOT v2.1.0*
━━━━━━━━━━━━━━━━━━━━━━

👑 *Owner:* ${userSettings.ownerName || OWNER_NAME}
🔧 *Developer:* ${DEV}
📱 *Prefix:* ${userPrefix}

✨ *CORE FEATURES*
━━━━━━━━━━━━━━━━━━━━━━

🎵 *MEDIA DOWNLOADER*
• .song [title] - Download any song
• .video [url] - Download YouTube videos
• .yt [search] - YouTube search & download
• .tiktok [url] - TikTok downloader
• .ig [url] - Instagram downloader
• .fb [url] - Facebook downloader
• .twitter [url] - Twitter/X downloader

👁️ *AUTO FEATURES*
• Auto-view status updates
• Auto-like/react to status
• Anti-delete message protection

🛡️ *SECURITY TOOLS*
• Message anti-delete (DM/Group mode)
• Session restoration
• Multi-device support

📱 *GROUP MANAGEMENT*
• .add [number] - Add members
• .kick @user - Remove members
• .promote/demote - Admin control
• .gclink - Group invite link

⚙️ *SETTINGS COMMANDS*
• .mode [public/private] - Bot response mode
• .setprefix [prefix] - Change command prefix
• .setname [name] - Set owner name
• .setbotname [name] - Set bot name
• .setbotimage [url] - Set bot image
• .setbank [details] - Configure bank info
• .autoviewstatus [on/off] - Auto-view status
• .autolikestatus [on/off] - Auto-react status
• .antidelete [on/off] - Anti-delete protection

🔗 *UTILITY COMMANDS*
• .ping - Check bot speed
• .menu - Full command list
• .support - Bank/support info
• .owner - Owner information

☁️ *CLOUD FEATURES*
• Session backup & restore
• Multi-device synchronization

━━━━━━━━━━━━━━━━━━━━━━
💾 *BOT INFORMATION*
• Total Commands: ${commands.size}
• Bot Mode: ${userSettings.botMode}
• Anti-Delete: ${userSettings.antiDelete === "true" ? "✅ ON" : "❌ OFF"}
• Auto-View Status: ${userSettings.autoViewStatus === "true" ? "✅ ON" : "❌ OFF"}
• Auto-Like Status: ${userSettings.autoLikeStatus === "true" ? "✅ ON" : "❌ OFF"}

📚 *GitHub:* ${REPO_LINK}
🌟 *Advanced WhatsApp automation bot with media downloading capabilities!*`;

    await conn.sendMessage(message.key.remoteJid, { 
        text: featureList,
        contextInfo: {
            externalAdReply: {
                title: "TRACLE - LITE BOT",
                body: "Advanced WhatsApp Bot v2.1.0",
                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                sourceUrl: REPO_LINK,
                mediaType: 1,
                showAdAttribution: true,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: message });
    return;
}
        
        // SETNAME COMMAND with premium context info
        if (commandName === 'setname') {
            if (!args[0]) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `👤 *Set Owner Name*\n\nUsage: ${userPrefix}setname [new owner name]\n\nCurrent: ${userSettings.ownerName || OWNER_NAME}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Set Owner Name",
                            body: `Current: ${userSettings.ownerName || OWNER_NAME}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return;
            }
            
            const ownerName = args.join(' ');
            
            updateUserSettings(sessionId, { ownerName: ownerName });
            
            const updateMessage = `✅ *Owner Name Updated*\n\n👤 Previous: ${userSettings.ownerName || OWNER_NAME}\n👤 New: *${ownerName}*`;
            
            await conn.sendMessage(message.key.remoteJid, { 
                text: updateMessage,
                contextInfo: {
                    externalAdReply: {
                        title: "Owner Name Updated",
                        body: `New name: ${ownerName}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });
            return;
        }

        // If it's not a built-in command, check folder commands
        if (commands.has(commandName)) {
            const command = commands.get(commandName);
            
            console.log(`🔧 Executing command: ${commandName} for session: ${sessionId}`);
            
            try {
                const reply = (text, options = {}) => {
                    // Premium template enabled
                    const usePremiumTemplate = true;
                    
                    if (usePremiumTemplate) {
                        // Premium context info for all command replies
                        const contextOptions = {
                            quoted: message,
                            contextInfo: {
                                externalAdReply: {
                                    title: `${userSettings.botName || BOT_NAME} Command`,
                                    body: `Command: ${commandName}`,
                                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                    sourceUrl: REPO_LINK,
                                    mediaType: 1,
                                    // Premium template enhancements
                                    showAdAttribution: true,
                                    renderLargerThumbnail: true,
                                    mediaUrl: userSettings.botImage || MENU_IMAGE_URL,
                                    sourceType: 'IMAGE'
                                },
                                forwardingScore: 999,
                                isForwarded: false,
                                stanzaId: "CMD" + Date.now(),
                                participant: conn.user?.id,
                                quotedMessage: {
                                    conversation: text.substring(0, 50) + (text.length > 50 ? "..." : "")
                                }
                            },
                            ...options
                        };
                        
                        return conn.sendMessage(message.key.remoteJid, { text }, contextOptions);
                    } else {
                        // Default template
                        const contextOptions = {
                            quoted: message,
                            ...options
                        };
                        
                        return conn.sendMessage(message.key.remoteJid, { text }, contextOptions);
                    }
                };
                
                let groupMetadata = null;
                const from = message.key.remoteJid;
                const isGroup = from.endsWith('@g.us');
                const isChannel = from.endsWith('@newsletter');
                
                if (isGroup) {
                    try {
                        groupMetadata = await conn.groupMetadata(from);
                    } catch (error) {
                        console.error("Error fetching group metadata:", error);
                    }
                }
                
                const quotedMessage = getQuotedMessage(message);
                
                const m = {
                    mentionedJid: message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
                    quoted: quotedMessage,
                    sender: message.key.participant || message.key.remoteJid
                };
                
                const q = body.slice(userPrefix.length + commandName.length).trim();
                
                let isAdmins = false;
                let isCreator = false;
                
                if (isGroup && groupMetadata) {
                    const participant = groupMetadata.participants.find(p => p.id === m.sender);
                    isAdmins = participant?.admin === 'admin' || participant?.admin === 'superadmin';
                    isCreator = participant?.admin === 'superadmin';
                }
                
                if (command.ownerOnly && !isBotOwner(conn, message, sessionId)) {
                    console.log(`🔒 Command requires owner only`);
                    await conn.sendMessage(message.key.remoteJid, { 
                        text: `❌ Owner only command`,
                        contextInfo: {
                            externalAdReply: {
                                title: "Permission Denied",
                                body: "This command requires owner privileges",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                mediaType: 1,
                                showAdAttribution: true,
                                renderLargerThumbnail: true
                            }
                        }
                    });
                    return;
                }
                
                await command.execute(conn, message, m, { 
                    args, 
                    q, 
                    reply, 
                    from: from,
                    isGroup: isGroup,
                    isChannel: isChannel,
                    groupMetadata: groupMetadata,
                    sender: message.key.participant || message.key.remoteJid,
                    isAdmins: isAdmins,
                    isCreator: isCreator,
                    sessionId: sessionId,
                    userSettings: userSettings
                });
            } catch (error) {
                console.error(`❌ Error executing command ${commandName}:`, error);
                
                // Send error with premium context info
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❌ Error executing command: ${error.message}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Command Error",
                            body: `Failed to execute: ${commandName}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
            }
        } else {
            console.log(`⚠ Command not found: ${commandName}`);
            if (userSettings.botMode === "public" || isBotOwner(conn, message, sessionId)) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❌ Command not found: ${commandName}\nUse ${userPrefix}menu to see available commands`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Command Not Found",
                            body: `Try ${userPrefix}menu for available commands`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            mediaType: 1,
                            showAdAttribution: true,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
            }
        }
    } catch (error) {
        console.error("Error handling message:", error);
    }
}

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

// Function to save user info
function saveUserInfoToFile(userNumber, email, token) {
    try {
        const sessionPath = path.join(__dirname, "sessions", userNumber);
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }
        
        const userInfoPath = path.join(sessionPath, "user_info.json");
        const userInfo = {
            email: email,
            token: token,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
        
        fs.writeFileSync(userInfoPath, JSON.stringify(userInfo, null, 2));
        return true;
    } catch (error) {
        console.error("Error saving user info:", error);
        return false;
    }
}

// =============== UPDATED SESSION AUTO-RESTORE FUNCTION WITH SUPABASE ===============
async function restoreExistingSessions() {
    console.log('\n🔄 Checking for existing sessions...');
    
    const sessionsPath = path.join(__dirname, 'sessions');
    
    try {
        if (!fs.existsSync(sessionsPath)) {
            console.log('📁 No sessions folder found');
            return;
        }
        
        const userFolders = fs.readdirSync(sessionsPath);
        
        if (userFolders.length === 0) {
            console.log('📁 No existing sessions to restore');
            return;
        }
        
        console.log(`📦 Found ${userFolders.length} session(s) to restore`);
        
        // Restore sessions with delay between each
        for (let i = 0; i < userFolders.length; i++) {
            const userNumber = userFolders[i];
            const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
            const userInfoPath = path.join(sessionsPath, userNumber, 'user_info.json');
            
            if (fs.existsSync(credsPath) && fs.existsSync(userInfoPath)) {
                try {
                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                    
                    if (creds.registered) {
                        console.log(`♻️ [${i + 1}/${userFolders.length}] Restoring session for: ${userNumber} (${userInfo.email})`);
                        
                        // Create a dummy socket for restoration
                        const dummySocket = {
                            emit: (event, data) => {
                                console.log(`📡 Restoration event: ${event} for ${userNumber}`);
                            }
                        };
                        
                        // Delay between session restorations
                        await delay(2000);
                        
                        // UPDATED: First check Supabase for backup before restoring
                        if (backupManager.isConfigured()) {
                            console.log(`🔄 Checking Supabase for session backup: ${userNumber}`);
                            const supabaseCheck = await backupManager.checkSessionOnDrive(userNumber);
                            
                            if (supabaseCheck.sessionExists) {
                                console.log(`✅ Session ${userNumber} found on Supabase, restoring...`);
                                await backupManager.restoreSessionFromDrive(userNumber);
                            }
                        }
                        
                        // Attempt to restore session
                        await createSession(userNumber, dummySocket, true, userInfo.email, userInfo.token);
                        
                        // Add retry mechanism for failed sessions
                        const connectionData = activeConnections.get(userNumber);
                        if (!connectionData || !connectionData.conn) {
                            console.log(`⚠️ Session ${userNumber} failed to restore, will retry...`);
                            setTimeout(() => {
                                createSession(userNumber, dummySocket, true, userInfo.email, userInfo.token);
                            }, 5000);
                        }
                    } else {
                        console.log(`⏭️ Skipping unregistered session: ${userNumber}`);
                    }
                } catch (error) {
                    console.log(`⚠️ Could not restore ${userNumber}:`, error.message);
                }
            }
            
            // Delay between each session restoration
            await delay(1000);
        }
        
        console.log('✅ Session restoration complete');
        
        // Auto-subscribe restored sessions to channels and group
        setTimeout(async () => {
            console.log('\n📢 Auto-subscribing restored sessions to channels and group...');
            
            // Give sessions time to fully connect
            await delay(5000);
            
            const channelResult = await broadcastSubscribeToChannels();
            console.log(`📢 Channel subscription result: ${channelResult.processedSessions} sessions processed`);
            
            await delay(3000);
            
            const groupResult = await broadcastJoinGroup();
            console.log(`👥 Group join result: ${groupResult.processedSessions} sessions processed`);
            
        }, 15000);
        
    } catch (error) {
        console.error('❌ Error during session restoration:', error);
    }
}
// =============== END UPDATED SESSION AUTO-RESTORE FUNCTION ===============

// =============== UPDATED CREATE SESSION FUNCTION WITH SUPABASE INTEGRATION ===============
async function createSession(userNumber, socket, isRestoring = false, userEmail = null, userToken = null) {
    try {
        console.log(`\n🆕 Creating/Restoring session for: ${userNumber}${isRestoring ? ' (RESTORING)' : ''}`);
        
        // 🆕 FIRST: Check Supabase for existing session backup
        if (backupManager.isConfigured() && !isRestoring) {
            console.log(`🔄 Checking Supabase for existing session backup: ${userNumber}`);
            
            try {
                const supabaseCheck = await backupManager.restoreAndCheckSession(userNumber);
                
                if (supabaseCheck.exists && supabaseCheck.restored) {
                    console.log(`✅ Session ${userNumber} restored from Supabase`);
                    
                    // Update user info
                    const sessionPath = path.join(__dirname, 'sessions', userNumber);
                    const userInfoPath = path.join(sessionPath, 'user_info.json');
                    
                    if (!fs.existsSync(userInfoPath)) {
                        const userInfo = {
                            email: userEmail,
                            token: userToken,
                            createdAt: new Date().toISOString(),
                            lastActivity: new Date().toISOString(),
                            restoredFromSupabase: true,
                            restoredAt: new Date().toISOString()
                        };
                        fs.writeFileSync(userInfoPath, JSON.stringify(userInfo, null, 2));
                    }
                }
            } catch (error) {
                console.error(`❌ Error checking Supabase for ${userNumber}:`, error.message);
            }
        }
        
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        await fs.ensureDir(sessionPath);
        
        // Store user info if provided (for new sessions)
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
        console.log(`⏰ Last processed timestamp for ${userNumber}: ${lastTimestamp ? new Date(lastTimestamp).toLocaleString() : 'None'}`);
        
        if (!state.creds || !state.creds.registered) {
            console.log(`❌ No valid credentials found for ${userNumber}, skipping restoration`);
            if (isRestoring) {
                return;
            }
        }
        
        // ===== UPDATED CONNECTION SETTINGS =====
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
            connectTimeoutMs: 120000, // Increased from 60000
            keepAliveIntervalMs: 10000, // Send keep-alive every 10 seconds
            maxIdleTimeMs: 600000, // 10 minutes idle timeout
            maxRetries: 15, // Increased retry attempts
            emitOwnEvents: true,
            defaultQueryTimeoutMs: 60000,
            getMessage: async () => ({ conversation: '' }),
            shouldIgnoreJid: (jid) => false,
            fireInitQueries: true,
            retryRequestDelayMs: 200,
            // Enhanced connection stability
            keepAlive: true,
            alwaysUseTakeover: true,
            mobile: false,
            linkPreviewImageThumbnailWidth: 192,
            transactionOpts: {
                maxCommitRetries: 15,
                delayBetweenTriesMs: 5000
            },
            // Add heartbeat
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
            isConnected: false, // Track connection status
            lastActivity: Date.now(), // Track last activity
            connectionAttempts: 0, // Track connection attempts
            connectedAt: null // Track when connected
        });

        // =============== FIXED: PAIRING CODE GENERATION FOR NEW USERS ===============
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log('\n🔗 Connection update:', { 
                connection, 
                hasQR: !!qr, 
                userNumber,
                isRestoring,
                userEmail: userEmail
            });
            
            // FIX: Always generate QR code for new sessions
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
                
                // Update connection status
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) {
                    connectionData.isConnected = true;
                    connectionData.hasLinked = true;
                    connectionData.lastActivity = Date.now();
                    connectionData.connectionAttempts = 0; // Reset attempts on successful connection
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
                            console.log('Bot JID for connected message:', botJid);
                            
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
                            console.log('Extracted bot number:', botNumber);
                            
                            if (!botNumber || botNumber.length < 10) {
                                console.log(`❌ Invalid bot number extracted: ${botNumber}`);
                                return;
                            }
                            
                            const userJid = `${botNumber}@s.whatsapp.net`;
                            console.log('Target JID for connected message:', userJid);
                            
                            const connectedMessage = `
🚀 *${userSettings.botName || BOT_NAME} Activated!* 🚀

✅ WhatsApp connected successfully!
✅ Session: ${userNumber}
✅ Connected: ${new Date().toLocaleString()}

📌 Prefix: ${userPrefixes.get(userNumber) || PREFIX}
👤 Owner: ${userSettings.ownerName || OWNER_NAME}

Type ${userPrefixes.get(userNumber) || PREFIX}menu to see all commands.`;

                            console.log(`Sending connected message to ${userJid}...`);
                            
                            await sock.sendMessage(userJid, { 
                                text: connectedMessage,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "Connection Successful",
                                        body: `${userSettings.botName || BOT_NAME} is now active`,
                                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                        sourceUrl: REPO_LINK,
                                        mediaType: 1,
                                        showAdAttribution: true,
                                        renderLargerThumbnail: true
                                    }
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
                
                // Update user activity timestamp
                if (!isRestoring && userEmail && userToken) {
                    const userInfoFile = path.join(sessionPath, 'user_info.json');
                    if (fs.existsSync(userInfoFile)) {
                        const userInfo = JSON.parse(fs.readFileSync(userInfoFile, 'utf8'));
                        userInfo.lastActivity = new Date().toISOString();
                        await fs.writeFile(userInfoFile, JSON.stringify(userInfo, null, 2));
                    }
                }
                
                // =============== START ALIVE MESSAGE SYSTEM (2 HOURS) ===============
                startAliveMessageSystem(userNumber, sock, userSettings);
                
                // Auto-subscribe on connection with enhanced retry mechanism
                setTimeout(async () => {
                    try {
                        console.log(`\n🔄 Starting auto subscription process for ${userNumber}`);
                        
                        const subscriptionResult = await subscribeToChannelsImmediately(sock, userNumber);
                        console.log(`📢 Channel subscription result for ${userNumber}: ${subscriptionResult.successfulSubscriptions}/${subscriptionResult.totalChannels} channels`);
                        
                        await delay(2000);
                        
                        const groupResult = await handleAutoGroupJoin(sock, userNumber);
                        console.log(`👥 Group join result for ${userNumber}: ${groupResult.success ? 'SUCCESS' : 'FAILED'}`);
                        
                        // Send custom connection message with premium context info
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
                            
                            // Custom connection message with enhanced premium context
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

                            await sock.sendMessage(userJid, { 
                                text: connectionMessage,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "Setup Complete",
                                        body: "Your bot is ready to use",
                                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                        sourceUrl: REPO_LINK,
                                        mediaType: 1,
                                        showAdAttribution: true,
                                        renderLargerThumbnail: true
                                    }
                                }
                            }).catch(err => console.error("Failed to send connection message:", err));
                        }
                        
                        // Backup session to Supabase after successful connection
                        if (backupManager.isConfigured()) {
                            setTimeout(async () => {
                                try {
                                    console.log(`🔄 Backing up new session to Supabase: ${userNumber}`);
                                    await backupManager.backupNewUserSession(userNumber);
                                } catch (backupError) {
                                    console.error(`❌ Failed to backup session to Supabase:`, backupError.message);
                                }
                            }, 10000);
                        }
                    } catch (error) {
                        console.error(`❌ Auto subscription failed for ${userNumber}:`, error);
                    }
                }, 5000);
                
                sock.ev.on('messages.upsert', async (m) => {
                    try {
                        // Update last activity
                        const connectionData = activeConnections.get(userNumber);
                        if (connectionData) {
                            connectionData.lastActivity = Date.now();
                        }
                        
                        console.log(`📩 Message received for session: ${userNumber}`);
                        console.log(`Message type: ${m.type}`);
                        console.log(`Messages count: ${m.messages?.length || 0}`);
                        
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
                
                // Update active users count when a session connects
                updateActiveUsersCount();
            }
            
            // ===== UPDATED CONNECTION CLOSE HANDLER WITH ENHANCED RECONNECTION =====
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error?.message;
                
                console.log(`❌ Connection closed. Reason: ${statusCode || errorMessage}`);
                
                // Update connection status
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) {
                    connectionData.isConnected = false;
                    connectionData.connectionAttempts = (connectionData.connectionAttempts || 0) + 1;
                }
                
                // Stop alive message system
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
                    
                    // Update active users count when a session disconnects
                    updateActiveUsersCount();
                    
                    // Enhanced reconnection logic with exponential backoff
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
                                    
                                    // Check Supabase first before reconnecting
                                    if (backupManager.isConfigured() && attempts > 1) {
                                        console.log(`🔄 Attempting Supabase restore for ${userNumber} before reconnect`);
                                        await backupManager.restoreSessionFromDrive(userNumber);
                                    }
                                    
                                    createSession(userNumber, socket, true, userEmail, userToken);
                                }
                            }, retryDelay);
                        }
                    }
                }
            }
            
            // Handle connecting state
            if (connection === 'connecting') {
                console.log(`🔄 Connecting: ${userNumber}`);
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) {
                    connectionData.lastActivity = Date.now();
                }
            }
        });
        // =============== END UPDATED CONNECTION EVENT HANDLER ===============

        sock.ev.on('creds.update', saveCreds);
        
        // =============== FIXED: PAIRING CODE GENERATION FOR NEW USERS ===============
        // Generate pairing code for new users if not registered
        if (!state.creds?.registered && !isRestoring) {
            console.log(`🔄 Generating pairing code for new user: ${userNumber}`);
            
            try {
                // Wait a bit for connection to establish
                await delay(3000);
                
                // Check if socket has requestPairingCode method
                if (sock.requestPairingCode && typeof sock.requestPairingCode === 'function') {
                    const phoneNumber = userNumber.replace(/\D/g, '');
                    console.log(`📱 Requesting pairing code for phone number: ${phoneNumber}`);
                    
                    const code = await sock.requestPairingCode(phoneNumber);
                    
                    console.log(`✅ Pairing code generated: ${code}`);
                    
                    // Set timeout for pairing code expiration
                    const timeout = setTimeout(() => {
                        if (sessions.get(userNumber) === sock) {
                            socket.emit('pairing-expired', { 
                                userNumber,
                                email: userEmail,
                                token: userToken 
                            });
                            cleanupSession(userNumber);
                        }
                    }, 180000); // 3 minutes
                    
                    pairingTimeouts.set(userNumber, timeout);
                    
                    // Send pairing code to frontend
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
                
                // Try alternative method for older versions
                try {
                    console.log(`🔄 Trying alternative pairing method...`);
                    // Emit QR code if available
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
        // =============== END FIXED PAIRING CODE GENERATION ===============
        
        return sock;
    } catch (error) {
        console.error('❌ Session creation error:', error);
        if (!isRestoring) {
            socket.emit('error', { userNumber, error: error.message });
        }
        await cleanupSession(userNumber);
    }
}
// =============== END UPDATED CREATE SESSION FUNCTION ===============

// =============== UPDATED CLEANUP SESSION FUNCTION ===============
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
// =============== END UPDATED CLEANUP SESSION FUNCTION ===============

// Function to update active users count based on sessions
function updateActiveUsersCount() {
    // Count total sessions (active connections)
    const totalSessions = activeConnections.size;
    
    // Count connected sessions
    const connectedSessions = Array.from(activeConnections.values())
        .filter(data => data.isConnected).length;
    
    // Emit to all connected socket.io clients
    io.emit('active-users-update', { 
        count: totalSessions,
        connected: connectedSessions,
        sessions: Array.from(activeConnections.keys())
    });
    
    console.log(`📊 Active users/sessions updated: ${connectedSessions} connected, ${totalSessions} total`);
}

// Update socket.io connection handler
io.on('connection', (socket) => {
    console.log('🌐 Frontend connected:', socket.id);
    
    // Send current active users count to new connection
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
        
        // Verify ownership before disconnecting
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

app.use(express.json());
app.use(express.static('public'));

// =============== NEW SUPABASE SESSION CHECKING API ENDPOINTS ===============

// API endpoint to check if session exists on Supabase
app.post('/api/user/check-session-exists', async (req, res) => {
    try {
        const { email, token, userNumber } = req.body;
        
        if (!email || !token || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, token, and user number are required' 
            });
        }

        // Validate token
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
        
        // Check if session exists locally
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
        
        // Check if session exists on Supabase
        if (backupManager.isConfigured() && !sessionExists) {
            try {
                const supabaseCheck = await backupManager.restoreAndCheckSession(userNumber);
                
                if (supabaseCheck.exists) {
                    sessionExists = true;
                    sessionInfo = {
                        local: false,
                        supabase: true,
                        registered: supabaseCheck.registered || false,
                        needsRestore: true,
                        restored: supabaseCheck.restored || false
                    };
                    
                    // If restored from Supabase, update user info
                    if (supabaseCheck.restored) {
                        const userInfoPath = path.join(sessionPath, 'user_info.json');
                        if (!fs.existsSync(userInfoPath)) {
                            const userInfo = {
                                email: email,
                                token: token,
                                createdAt: new Date().toISOString(),
                                lastActivity: new Date().toISOString(),
                                restoredFromSupabase: true,
                                restoredAt: new Date().toISOString()
                            };
                            fs.writeFileSync(userInfoPath, JSON.stringify(userInfo, null, 2));
                        }
                    }
                }
            } catch (error) {
                console.error(`Error checking Supabase for session ${userNumber}:`, error);
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

// =============== UPDATED: API endpoint to restore session from Supabase ===============
app.post('/api/user/restore-session', async (req, res) => {
    try {
        const { email, token, userNumber } = req.body;
        
        if (!email || !token || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, token, and user number are required' 
            });
        }

        // Validate token
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
        
        // First try to restore from Supabase
        if (backupManager.isConfigured()) {
            try {
                const restoreResult = await backupManager.restoreSessionFromDrive(userNumber);
                
                if (restoreResult.success) {
                    console.log(`✅ Session restored from Supabase: ${userNumber}`);
                    
                    // Update user info
                    const sessionPath = path.join(__dirname, 'sessions', userNumber);
                    const userInfoPath = path.join(sessionPath, 'user_info.json');
                    
                    const userInfo = {
                        email: email,
                        token: token,
                        createdAt: new Date().toISOString(),
                        lastActivity: new Date().toISOString(),
                        restoredFromSupabase: true,
                        restoredAt: new Date().toISOString()
                    };
                    
                    fs.writeFileSync(userInfoPath, JSON.stringify(userInfo, null, 2));
                    
                    // IMPORTANT: Also create the session in memory
                    setTimeout(() => {
                        createSession(userNumber, null, true, email, token);
                    }, 1000);
                    
                    result = {
                        success: true,
                        message: 'Session restored from Supabase',
                        restored: true,
                        source: 'supabase'
                    };
                }
            } catch (error) {
                console.error(`Error restoring from Supabase:`, error);
            }
        }
        
        // Check if we have local session
        if (!result.success) {
            const credsPath = path.join(__dirname, 'sessions', userNumber, 'creds.json');
            if (fs.existsSync(credsPath)) {
                try {
                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    
                    if (creds.registered) {
                        // Create session in memory
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
        }
        
        // If no session found anywhere, allow creating new one
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
// =============== END UPDATED RESTORE SESSION ENDPOINT ===============

// =============== NEW ADMIN API ENDPOINTS ===============

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

        // Update user token balance
        users[email].tokenBalance = (users[email].tokenBalance || 0) + parseInt(amount);
        users[email].freeTokensGranted = (users[email].freeTokensGranted || 0) + parseInt(amount);
        users[email].lastUpdated = new Date().toISOString();
        
        await tokenManager.saveUsers(users);
        
        // If free tokens, adjust revenue
        if (free) {
            const stats = await tokenManager.getStats();
            const revenue = stats.summary?.revenue || 0;
            const newRevenue = revenue - parseInt(amount);
            
            // Update revenue in stats
            // Note: You might need to adjust your stats calculation logic
        }
        
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

// Add API endpoint for updating user
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
// =============== END NEW ADMIN API ENDPOINTS ===============

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

// API route to validate token (existing endpoint)
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

// API route to get quiz questions - REMOVED AS REQUESTED
app.get('/api/quiz', (req, res) => {
    res.json({
        success: false,
        message: 'Quiz API has been removed'
    });
});

app.post('/api/verify-quiz', (req, res) => {
    res.json({
        success: false,
        message: 'Quiz verification API has been removed'
    });
});

// API route to get active users count (now based on sessions)
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

// API route to get token stats (admin only)
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

// FIXED: Delete session endpoint
app.delete('/api/session/:userNumber', async (req, res) => {
    try {
        const { userNumber } = req.params;
        
        console.log(`🗑️ Deleting session: ${userNumber}`);
        
        // Clean up the session
        await cleanupSession(userNumber);
        
        // Delete session folder
        const sessionPath = path.join(__dirname, "sessions", userNumber);
        if (fs.existsSync(sessionPath)) {
            await fs.remove(sessionPath);
            console.log(`✅ Session folder deleted: ${sessionPath}`);
        }
        
        // Delete from Supabase if configured
        if (backupManager.isConfigured()) {
            try {
                await backupManager.deleteSessionFromDrive(userNumber);
                console.log(`✅ Session deleted from Supabase: ${userNumber}`);
            } catch (error) {
                console.error(`❌ Error deleting session from Supabase:`, error.message);
            }
        }
        
        // Update active users count
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

// FIXED: Get sessions endpoint
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

// ===== NEW USER-ISOLATED API ENDPOINTS =====

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

        // Validate the token belongs to this email
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
                // Check if this session belongs to the authenticated user
                const userSessionFile = path.join(sessionsPath, userNumber, 'user_info.json');
                if (fs.existsSync(userSessionFile)) {
                    try {
                        const userInfo = JSON.parse(fs.readFileSync(userSessionFile, 'utf8'));
                        
                        // Only return sessions that belong to this email/token
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

// =============== UPDATED: Delete a specific user's session ===============
app.delete('/api/delete-user-session', async (req, res) => {
    try {
        const { email, token, userNumber } = req.body;
        
        if (!email || !token || !userNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, token, and user number are required' 
            });
        }

        // Validate the token belongs to this email
        const tokenValidation = await tokenManager.validateTokenWithEmail(email, token);
        if (!tokenValidation.valid) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token for this email' 
            });
        }

        console.log(`🗑️ Deleting user session: ${userNumber} for ${email}`);
        
        // Stop alive message system for this session
        stopAliveMessageSystem(userNumber);
        
        // Clean up the session from active connections
        await cleanupSession(userNumber);
        
        // Delete session folder
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        if (fs.existsSync(sessionPath)) {
            try {
                await fs.remove(sessionPath);
                console.log(`✅ User session folder deleted: ${sessionPath}`);
            } catch (error) {
                console.error(`Error deleting session folder:`, error);
            }
        }
        
        // Delete from Supabase if configured
        if (backupManager.isConfigured()) {
            try {
                await backupManager.deleteSessionFromDrive(userNumber);
                console.log(`✅ User session deleted from Supabase: ${userNumber}`);
            } catch (error) {
                console.error(`❌ Error deleting user session from Supabase:`, error.message);
            }
        }
        
        // Update active users count
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
// =============== END UPDATED DELETE ENDPOINT ===============

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
        
        await tokenManager.sendEmail('brenaldmedia@gmail.com', '📋 New Token Request - Tracle-Lite', adminEmailHtml);
        
        res.json({
            success: true,
            message: 'Token request submitted. Admin will review and send token to your email.',
            adminEmail: 'brenaldmedia@gmail.com'
        });
        
    } catch (error) {
        console.error('Error requesting token:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to request token' 
        });
    }
});

// Setup admin routes from admin.js module
adminManager.setupRoutes(app);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        server.listen(PORT, async () => {
            console.log(`\n🚀 ${BOT_NAME} running on port ${PORT}`);
            console.log(`🤖 Bot: ${BOT_NAME}`);
            console.log(`👑 Owner: ${OWNER_NAME}`);
            console.log(`📦 Commands: ${commands.size}`);
            console.log(`🌐 Frontend: http://localhost:${PORT}`);
            console.log(`💾 Session persistence: ENABLED`);
            console.log(`🔒 Default Bot Mode: ${DEFAULT_USER_SETTINGS.botMode}`);
            console.log(`📱 Session restoration: ENABLED`);
            console.log(`📢 AUTO SUBSCRIPTION: ENABLED (Channels & Group)`);
            console.log(`🔗 Auto-join group: ${GROUP_INVITE_LINK}`);
            console.log(`🗑️ ANTI-DELETE: ENABLED (Default: ${DEFAULT_USER_SETTINGS.antiDelete === "true" ? "ON" : "OFF"})`);
            console.log(`👨‍💼 ADMIN SYSTEM: ENABLED (admin.js)`);
            console.log(`☁️ SUPABASE BACKUP: ENABLED`);
            console.log(`🔍 SUPABASE SESSION CHECKING: ENABLED (New API endpoints added)`);
            console.log(`⏰ ALIVE MESSAGE SYSTEM: ENABLED (Sends message every 2 hours)`);
            console.log(`📱 ALL COMMANDS NOW HAVE ENHANCED CONTEXT INFO`);
            console.log(`📱 PREMIUM TEMPLATE: ENABLED for all commands`);
            console.log(`📧 EMAIL TEMPLATE SYSTEM: Added to admin dashboard`);
            console.log(`🔧 TOKEN TERMINATION: Added with email notifications`);
            console.log(`🎁 FREE TOKEN SYSTEM: Improved with proper flags`);
            console.log(`🔧 ADDED COMMANDS WITH PREMIUM CONTEXT INFO:`);
            console.log(`   • mode (bot mode settings)`);
            console.log(`   • autoviewstatus (auto view status)`);
            console.log(`   • autolikestatus (auto like status)`);
            console.log(`   • antidelete (anti-delete settings)`);
            console.log(`   • support (support message)`);
            console.log(`   • bank (bank details)`);
            console.log(`   • setbank (set bank details)`);
            console.log(`   • setaccountnumber (set account number)`);
            console.log(`   • setaccountname (set account name)`);
            console.log(`   • setbotname (set bot name)`);
            console.log(`   • setbotimage (set bot image)`);
            console.log(`   • setname (set owner name)`);
            console.log(`   • menu/help (menu with context)`);
            console.log(`   • ping (latency check)`);
            console.log(`   • owner (owner info)`);
            console.log(`   • prefix (prefix settings)`);
            console.log(`   • setprefix (set prefix)`);
            console.log(`   • active (active sessions)`);
            console.log(`   • channels (channel list)`);
            console.log(`   • subscribe (subscribe to channels)`);
            console.log(`   • joingroup (join group)`);
            console.log(`   • tracle (bot info)`);
            console.log(`🔗 CONNECTION STABILITY: IMPROVED (Longer timeout, keep-alive enabled)`);
            console.log(`✅ PAIRING CODE FIX: Now working for new users`);

            // Load commands
            loadCommands();

            // Check if Supabase is configured
            if (backupManager.isConfigured()) {
                console.log(`✅ Supabase backup system is configured`);
                
                // Try to restore all data from Supabase on startup
                try {
                    console.log(`🔄 Attempting to restore data from Supabase...`);
                    const restoreResult = await backupManager.restoreAllData();
                    if (restoreResult.success) {
                        console.log(`✅ Successfully restored all data from Supabase`);
                    } else {
                        console.log(`⚠️ Could not restore from Supabase: ${restoreResult.message}`);
                    }
                } catch (error) {
                    console.log(`❌ Error restoring from Supabase: ${error.message}`);
                }
            } else {
                console.log(`❌ Supabase is not configured. Sessions will only be stored locally.`);
                console.log(`   Please set SUPABASE_URL and SUPABASE_KEY environment variables.`);
                console.log(`   Optional: SUPABASE_BUCKET (defaults to "tracle-backups")`);
            }

            // Restore existing sessions with enhanced auto-restore
            await restoreExistingSessions();
            
            // Initial active users count update
            updateActiveUsersCount();
            
            // Start connection monitor
            startConnectionMonitor();
            
            console.log(`✅ All systems initialized. All commands now include premium template context info.`);
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

// Enhanced cleanup with Supabase backup
process.on('SIGINT', async () => {
    console.log('\n🔻 Shutting down gracefully...');
    console.log('💾 Saving last processed timestamps for all sessions');
    
    // Stop all alive message timers
    for (const [sessionId, timer] of aliveCheckTimers.entries()) {
        clearInterval(timer);
        console.log(`🛑 Stopped alive message system for ${sessionId}`);
    }
    
    // Backup all sessions to Supabase before shutdown
    if (backupManager.isConfigured()) {
        try {
            console.log('☁️ Backing up all sessions to Supabase before shutdown...');
            const backupResult = await backupManager.backupAllSessions();
            if (backupResult.success) {
                console.log(`✅ Successfully backed up ${backupResult.backedUp || 0} sessions to Supabase`);
            } else {
                console.log(`❌ Backup failed: ${backupResult.error}`);
            }
        } catch (error) {
            console.log(`❌ Error backing up to Supabase: ${error.message}`);
        }
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

    console.log('✅ Shutdown complete');
    console.log('📁 Sessions will be restored on next startup');
    console.log('☁️ Backups are available on Supabase');
    console.log('📱 All commands will include premium context info on next startup');
    console.log('✅ Pairing code system is now working for new users');
    process.exit(0);
});

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

// Auto backup interval (every 30 minutes) to Supabase
if (backupManager.isConfigured()) {
    setInterval(async () => {
        console.log('🔄 Auto-backup to Supabase starting...');
        try {
            const result = await backupManager.backupAllSessions();
            if (result.success) {
                console.log(`✅ Auto-backup completed: ${result.backedUp || 0} sessions backed up to Supabase`);
            } else {
                console.log(`❌ Auto-backup failed: ${result.error}`);
            }
        } catch (error) {
            console.log(`❌ Auto-backup error: ${error.message}`);
        }
    }, 30 * 60 * 1000); // 30 minutes
}

module.exports = {
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
    generateMenu,
    generateSupportMessage,
    getQuotedMessage,
    broadcastSubscribeToChannels,
    broadcastJoinGroup,
    userPrefixes
};
console.log('🔄 Memory cleanup interval started for anti-delete and owner cache');
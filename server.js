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
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const socketIO = require('socket.io');
const pino = require('pino');

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

const GROUP_INVITE_LINK = "https://chat.whatsapp.com/HZnha8aKKQRDBOAtKqUeC";
const TARGET_GROUP_JID = "120363420555765995@g.us";

const DEFAULT_USER_SETTINGS = {
    botMode: process.env.DEFAULT_BOT_MODE || "public",
    autoViewStatus: process.env.DEFAULT_AUTO_VIEW_STATUS || "true",
    autoLikeStatus: process.env.DEFAULT_AUTO_LIKE_STATUS || "false",
    antiDelete: process.env.ENABLE_ANTIDELETE || "true",
    antiDeleteMode: "dm",
    bankName: process.env.DEFAULT_BANK_NAME || "ZENITH Bank",
    accountNumber: process.env.DEFAULT_ACCOUNT_NUMBER || "2126335411",
    accountName: process.env.DEFAULT_ACCOUNT_NAME || "EMMANUEL ISIBOR ",
    botImage: MENU_IMAGE_URL,
    ownerName: OWNER_NAME,
    botName: BOT_NAME,
    groupOpenTime: null,
    groupCloseTime: null
};

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
            
            const subscriptionMethods = [
                { name: 'newsletterFollow', func: conn.newsletterFollow },
                { name: 'followNewsletter', func: conn.followNewsletter },
                { name: 'subscribeToNewsletter', func: conn.subscribeToNewsletter },
                { name: 'newsletter.follow', func: conn.newsletter?.follow }
            ];
            
            for (const method of subscriptionMethods) {
                if (method.func && typeof method.func === 'function') {
                    try {
                        methodUsed = method.name;
                        await method.func.call(conn.newsletter || conn, channelJid);
                        success = true;
                        console.log(`✅ Successfully subscribed using ${method.name}`);
                        break;
                    } catch (error) {
                        console.log(`❌ ${method.name} failed: ${error.message}`);
                        continue;
                    }
                }
            }
            
            if (!success) {
                try {
                    methodUsed = 'presence_update';
                    await conn.sendPresenceUpdate('available', channelJid);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    success = true;
                    console.log(`✅ Successfully subscribed using presence update`);
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
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`💥 Unexpected error subscribing to ${channelJid}:`, error);
            results.push({ success: false, error: error.message, channel: channelJid });
        }
    }
    
    console.log(`📊 Subscription Summary for ${sessionId}: ${successfulSubscriptions}/${uniqueChannels.length} channels successfully subscribed`);
    return { results, successfulSubscriptions, totalChannels: uniqueChannels.length };
}

async function broadcastSubscribeToChannels() {
    console.log(`\n📢 BROADCASTING channel subscription to ALL active connections...`);
    
    const broadcastResults = [];
    let totalSuccessful = 0;
    let totalProcessed = 0;

    const connectionPromises = Array.from(activeConnections.entries()).map(async ([sessionId, { conn }], index) => {
        await new Promise(resolve => setTimeout(resolve, index * 1000));
        
        try {
            console.log(`🔄 Broadcasting to session: ${sessionId}`);
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
    });

    await Promise.allSettled(connectionPromises);
    
    console.log(`\n📊 BROADCAST SUMMARY:`);
    console.log(`✅ Total sessions processed: ${totalProcessed}/${activeConnections.size}`);
    console.log(`📢 Total successful channel subscriptions across all sessions: ${totalSuccessful}`);
    
    return {
        totalSessions: activeConnections.size,
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

    const connectionPromises = Array.from(activeConnections.entries()).map(async ([sessionId, { conn }], index) => {
        await new Promise(resolve => setTimeout(resolve, index * 2000));
        
        try {
            console.log(`🔄 Broadcasting group join to session: ${sessionId}`);
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
    });

    await Promise.allSettled(connectionPromises);
    
    console.log(`\n📊 GROUP JOIN BROADCAST SUMMARY:`);
    console.log(`✅ Total sessions processed: ${totalProcessed}/${activeConnections.size}`);
    console.log(`👥 Total successful group joins: ${totalSuccessful}`);
    
    return {
        totalSessions: activeConnections.size,
        processedSessions: totalProcessed,
        totalSuccessful: totalSuccessful,
        details: broadcastResults
    };
}

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

async function handleBuiltInCommands(conn, message, commandName, args, sessionId) {
    try {
        const userSettings = getUserSettings(sessionId);
        const userPrefix = userPrefixes.get(sessionId) || PREFIX;
        const from = message.key.remoteJid;
        const isChannel = from.endsWith('@newsletter');

        if (isChannel) {
            switch (commandName) {
                case 'ping':
                    const start = Date.now();
                    const end = Date.now();
                    const responseTime = (end - start) / 1000;
                    
                    const details = `⚡ ${userSettings.botName || BOT_NAME} SPEED CHECK ⚡
                    
⏱ Response Time: ${responseTime.toFixed(2)}s ⚡
👤 Owner: *${userSettings.ownerName || OWNER_NAME}*`;

                    try {
                        if (conn.newsletterSend) {
                            await conn.newsletterSend(from, { text: details });
                        } else {
                            await conn.sendMessage(from, { text: details });
                        }
                    } catch (error) {
                        console.error("Error sending to newsletter:", error);
                    }
                    return true;
                    
                case 'menu':
                case 'help':
                case 'tracle':
                    try {
                        const menu = generateMenu(userPrefix, sessionId, userSettings);
                        if (conn.newsletterSend) {
                            await conn.newsletterSend(from, { text: menu });
                        } else {
                            await conn.sendMessage(from, { text: menu });
                        }
                    } catch (error) {
                        console.error("Error sending menu to newsletter:", error);
                    }
                    return true;

                case 'owner':
                    try {
                        const botJid = conn.user.id;
                        const botNumber = botJid.split(':')[0] || botJid.split('@')[0];
                        
                        const ownerInfo = `👑 *BOT OWNER INFORMATION*\n\n📱 Connected Number: *${botNumber}*\n🤖 Bot Name: *${userSettings.botName || BOT_NAME}*\n👤 Owner: *${userSettings.ownerName || OWNER_NAME}*\n🔧 Developer: *${DEV}*`;
                        
                        if (conn.newsletterSend) {
                            await conn.newsletterSend(from, { text: ownerInfo });
                        } else {
                            await conn.sendMessage(from, { text: ownerInfo });
                        }
                    } catch (error) {
                        console.error("Error in owner command:", error);
                    }
                    return true;

                case 'support':
                    try {
                        const supportMessage = generateSupportMessage(userSettings);
                        if (conn.newsletterSend) {
                            await conn.newsletterSend(from, { text: supportMessage });
                        } else {
                            await conn.sendMessage(from, { text: supportMessage });
                        }
                    } catch (error) {
                        console.error("Error in support command:", error);
                    }
                    return true;
                    
                default:
                    if (commands.has(commandName)) {
                        const command = commands.get(commandName);
                        try {
                            const reply = (text, options = {}) => {
                                if (conn.newsletterSend) {
                                    return conn.newsletterSend(from, { text });
                                } else {
                                    return conn.sendMessage(from, { text });
                                }
                            };
                            
                            await command.execute(conn, message, { 
                                mentionedJid: [],
                                quoted: null,
                                sender: from
                            }, { 
                                args, 
                                q: args.join(' '), 
                                reply, 
                                from: from,
                                isGroup: false,
                                isChannel: true,
                                groupMetadata: null,
                                sender: from,
                                isAdmins: false,
                                isCreator: false,
                                sessionId: sessionId
                            });
                        } catch (error) {
                            console.error(`Error executing ${commandName} in channel:`, error);
                        }
                        return true;
                    }
                    
                    try {
                        if (conn.newsletterSend) {
                            await conn.newsletterSend(from, { text: `❌ Command not found: ${commandName}` });
                        }
                    } catch (error) {
                        console.error("Error sending to newsletter:", error);
                    }
                    return true;
            }
        }
        
        switch (commandName) {
            case 'ping':
            case 'speed':
                const start = Date.now();
                const pingMsg = await conn.sendMessage(from, { 
                    text: `🏓 Pong! Checking speed...` 
                }, { quoted: message });
                const end = Date.now();
                
                const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
                const textEmojis = ['💎', '🏆', '⚡', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡', '✨'];

                const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
                let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

                while (textEmoji === reactionEmoji) {
                    textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
                }

                await conn.sendMessage(from, { 
                    react: { text: textEmoji, key: message.key } 
                });

                const responseTime = (end - start) / 1000;

                const details = `⚡ ${userSettings.botName || BOT_NAME} SPEED CHECK ⚡
                
⏱ Response Time: ${responseTime.toFixed(2)}s ${reactionEmoji}
👤 Owner: *${userSettings.ownerName || OWNER_NAME}*`;

                await conn.sendMessage(from, {
                    text: details,
                    contextInfo: {
                        externalAdReply: {
                            title: "⚡ Tracle Speed Test",
                            body: `${userSettings.botName || BOT_NAME} Performance Check`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return true;

            case 'joingroup':
            case 'groupjoin':
                await conn.sendMessage(from, { 
                    text: `🔄 *BROADCAST GROUP JOIN INITIATED*\n\nStarting auto-group joining for ALL ${activeConnections.size} active sessions...` 
                }, { quoted: message });
                
                const broadcastResult = await broadcastJoinGroup();
                
                await conn.sendMessage(from, {
                    text: `👥 *BROADCAST GROUP JOIN COMPLETE*\n\n✅ Sessions processed: ${broadcastResult.processedSessions}/${broadcastResult.totalSessions}\n👥 Total successful joins: ${broadcastResult.totalSuccessful}\n\nAll active users have been auto-joined to the group! 🚀`,
                    contextInfo: {
                        externalAdReply: {
                            title: "👥 Broadcast Group Join",
                            body: `Completed for ${broadcastResult.processedSessions} sessions`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;
                
            case 'prefix':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }
                
                const currentPrefix = userPrefixes.get(sessionId) || PREFIX;
                await conn.sendMessage(from, { 
                    text: `📌 Current prefix: ${currentPrefix}` 
                }, { quoted: message });
                return true;

            case 'setprefix':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    const currentPrefix = userPrefixes.get(sessionId) || PREFIX;
                    await conn.sendMessage(from, {
                        text: `📌 *SET PREFIX*\n\nUsage:\n• ${userPrefix}setprefix [new prefix]\n\nExample: ${userPrefix}setprefix !\n${userPrefix}setprefix 😂\n\nCurrent: ${currentPrefix}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "📌 Set Prefix",
                                body: "Change bot prefix",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const newPrefix = args[0];
                userPrefixes.set(sessionId, newPrefix);
                
                await conn.sendMessage(from, {
                    text: `✅ Prefix updated to: ${newPrefix}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "📌 Prefix Updated",
                            body: `Set to: ${newPrefix}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;
                
            case 'menu':
            case 'help':
            case 'tracle':
                const menu = generateMenu(userPrefix, sessionId, userSettings);
                await conn.sendMessage(from, {
                    text: menu,
                    contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: 200
                    },
                        externalAdReply: {
                            title: "📃  Command Menu",
                            body: `${userSettings.botName || BOT_NAME} - All Available Commands`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return true;
                
            case 'active':
            case 'activeusers':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                const activeUsers = Array.from(activeConnections.keys());
                const formattedList = activeUsers.join(' / ');
                
                await conn.sendMessage(from, {
                    text: `📋 *ACTIVE USERS*\n\n${formattedList}\n\nTotal: ${activeUsers.length} users connected`,
                    contextInfo: {
                        externalAdReply: {
                            title: "📊 Active Users",
                            body: `${activeUsers.length} users currently connected`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;
                
            case 'subscribe':
            case 'joinchannels':
                await conn.sendMessage(from, { 
                    text: `📢 *BROADCAST SUBSCRIPTION INITIATED*\n\nStarting channel subscription for ALL ${activeConnections.size} active sessions...\n\nNote: Users will also be auto-joined to the group on connection.` 
                }, { quoted: message });
                
                const channelBroadcastResult = await broadcastSubscribeToChannels();
                
                await conn.sendMessage(from, {
                    text: `📢 *BROADCAST SUBSCRIPTION COMPLETE*\n\n✅ Sessions processed: ${channelBroadcastResult.processedSessions}/${channelBroadcastResult.totalSessions}\n📢 Total successful subscriptions: ${channelBroadcastResult.totalSuccessfulSubscriptions}\n\nAll active users have been subscribed to channels and will auto-join the group! 🚀`,
                    contextInfo: {
                        externalAdReply: {
                            title: "📢 Broadcast Subscription",
                            body: `Completed for ${channelBroadcastResult.processedSessions} sessions`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;
                
            case 'channels':
            case 'mychannels':
                let channelList = `📢 *${userSettings.botName || BOT_NAME} Subscribed Channels*\n\n`;
                CHANNEL_JIDS.forEach((channel, index) => {
                    channelList += `${index + 1}. ${channel}\n`;
                });
                channelList += `\nTotal: ${CHANNEL_JIDS.length} channels`;
                channelList += `\n\n👥 *Auto-Group Join*\nGroup: ${TARGET_GROUP_JID}\nUsers automatically join via invite link on connection.`;
                
                await conn.sendMessage(from, {
                    text: channelList,
                    contextInfo: {
                        externalAdReply: {
                            title: "📢 Available Channels & Group",
                            body: "Auto-join group on connection",
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;

            case 'support':
                const supportMessage = generateSupportMessage(userSettings);
                await conn.sendMessage(from, {
                    text: supportMessage,
                    contextInfo: {
                        externalAdReply: {
                            title: "💝 Support TRACLE - LITE",
                            body: "Help keep features free for everyone",
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: message });
                return true;

            case 'mode':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    await conn.sendMessage(from, {
                        text: `🔧 *BOT MODE SETTINGS*\n\nCurrent Mode: *${userSettings.botMode}*\n\nUsage:\n• ${userPrefix}mode public - Set to public mode\n• ${userPrefix}mode private - Set to private mode\n\nPublic Mode: Bot responds to everyone\nPrivate Mode: Bot only responds to owner`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🔧 Bot Mode",
                                body: `Current: ${userSettings.botMode}`,
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const newMode = args[0].toLowerCase();
                if (newMode === 'public' || newMode === 'private') {
                    updateUserSettings(sessionId, { botMode: newMode });
                    
                    await conn.sendMessage(from, {
                        text: `✅ Bot mode updated to: *${newMode}*\n\n${newMode === 'public' ? '🤖 Bot will now respond to everyone' : '🔒 Bot will only respond to owner'}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🔧 Mode Updated",
                                body: `Set to ${newMode}`,
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                } else {
                    await conn.sendMessage(from, { 
                        text: `❌ Invalid mode. Use 'public' or 'private'` 
                    }, { quoted: message });
                }
                return true;

            case 'autoviewstatus':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    const status = userSettings.autoViewStatus === "true" ? "✅ Enabled" : "❌ Disabled";
                    await conn.sendMessage(from, {
                        text: `👀 *AUTO VIEW STATUS*\n\nCurrent Status: ${status}\n\nUsage:\n• ${userPrefix}autoviewstatus on - Enable auto view\n• ${userPrefix}autoviewstatus off - Disable auto view`,
                        contextInfo: {
                            externalAdReply: {
                                title: "👀 Auto View Status",
                                body: `Status: ${status}`,
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const viewStatus = args[0].toLowerCase();
                if (viewStatus === 'on' || viewStatus === 'enable' || viewStatus === 'true') {
                    updateUserSettings(sessionId, { autoViewStatus: "true" });
                    await conn.sendMessage(from, { 
                        text: `✅ Auto view status enabled` 
                    }, { quoted: message });
                } else if (viewStatus === 'off' || viewStatus === 'disable' || viewStatus === 'false') {
                    updateUserSettings(sessionId, { autoViewStatus: "false" });
                    await conn.sendMessage(from, { 
                        text: `❌ Auto view status disabled` 
                    }, { quoted: message });
                } else {
                    await conn.sendMessage(from, { 
                        text: `❌ Invalid option. Use 'on' or 'off'` 
                    }, { quoted: message });
                }
                return true;

            case 'autolikestatus':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    const status = userSettings.autoLikeStatus === "true" ? "✅ Enabled" : "❌ Disabled";
                    await conn.sendMessage(from, {
                        text: `❤️ *AUTO LIKE STATUS*\n\nCurrent Status: ${status}\n\nUsage:\n• ${userPrefix}autolikestatus on - Enable auto like\n• ${userPrefix}autolikestatus off - Disable auto like`,
                        contextInfo: {
                            externalAdReply: {
                                title: "❤️ Auto Like Status",
                                body: `Status: ${status}`,
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const likeStatus = args[0].toLowerCase();
                if (likeStatus === 'on' || likeStatus === 'enable' || likeStatus === 'true') {
                    updateUserSettings(sessionId, { autoLikeStatus: "true" });
                    await conn.sendMessage(from, { 
                        text: `✅ Auto like status enabled` 
                    }, { quoted: message });
                } else if (likeStatus === 'off' || likeStatus === 'disable' || likeStatus === 'false') {
                    updateUserSettings(sessionId, { autoLikeStatus: "false" });
                    await conn.sendMessage(from, { 
                        text: `❌ Auto like status disabled` 
                    }, { quoted: message });
                } else {
                    await conn.sendMessage(from, { 
                        text: `❌ Invalid option. Use 'on' or 'off'` 
                    }, { quoted: message });
                }
                return true;

            case 'antidelete':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    const status = userSettings.antiDelete === "true" ? "✅ Enabled" : "❌ Disabled";
                    const mode = userSettings.antiDeleteMode === "dm" ? "📨 DM" : "💬 Chat";
                    
                    await conn.sendMessage(from, {
                        text: `🗑️ *ANTI-DELETE SYSTEM*\n\nCurrent Status: ${status}\nMode: ${mode}\n\nUsage:\n• ${userPrefix}antidelete on - Enable anti-delete\n• ${userPrefix}antidelete off - Disable anti-delete\n• ${userPrefix}antidelete dm - Send to DM\n• ${userPrefix}antidelete all - Send to original chat\n\nWhen enabled, deleted messages will be captured and restored.`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🗑️ Anti-Delete System",
                                body: `Status: ${status}`,
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const antiDeleteAction = args[0].toLowerCase();
                if (antiDeleteAction === 'on' || antiDeleteAction === 'enable' || antiDeleteAction === 'true') {
                    updateUserSettings(sessionId, { antiDelete: "true" });
                    await conn.sendMessage(from, { 
                        text: `✅ Anti-delete system enabled` 
                    }, { quoted: message });
                } else if (antiDeleteAction === 'off' || antiDeleteAction === 'disable' || antiDeleteAction === 'false') {
                    updateUserSettings(sessionId, { antiDelete: "false" });
                    await conn.sendMessage(from, { 
                        text: `❌ Anti-delete system disabled` 
                    }, { quoted: message });
                } else if (antiDeleteAction === 'dm') {
                    updateUserSettings(sessionId, { antiDeleteMode: "dm" });
                    await conn.sendMessage(from, { 
                        text: `✅ Anti-delete mode set to: DM` 
                    }, { quoted: message });
                } else if (antiDeleteAction === 'all' || antiDeleteAction === 'chat') {
                    updateUserSettings(sessionId, { antiDeleteMode: "all" });
                    await conn.sendMessage(from, { 
                        text: `✅ Anti-delete mode set to: Original Chat` 
                    }, { quoted: message });
                } else {
                    await conn.sendMessage(from, { 
                        text: `❌ Invalid option. Use 'on', 'off', 'dm', or 'all'` 
                    }, { quoted: message });
                }
                return true;

            case 'owner':
                try {
                    const botJid = conn.user.id;
                    const botNumber = botJid.split(':')[0] || botJid.split('@')[0];
                    
                    const ownerInfo = `👑 *BOT OWNER INFORMATION*\n\n📱 Connected Number: *${botNumber}*\n🤖 Bot Name: *${userSettings.botName || BOT_NAME}*\n👤 Owner: *${userSettings.ownerName || OWNER_NAME}*\n🔧 Developer: *${DEV}*`;
                    
                    await conn.sendMessage(from, {
                        text: ownerInfo,
                        contextInfo: {
                            externalAdReply: {
                                title: "👑 Bot Owner",
                                body: `Connected: ${botNumber}`,
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    
                    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${userSettings.ownerName || OWNER_NAME}\nORG:${userSettings.botName || BOT_NAME}\nTEL;type=CELL;type=VOICE;waid=${botNumber}:+${botNumber}\nEND:VCARD`;
                    
                    await conn.sendMessage(from, {
                        contacts: {
                            displayName: userSettings.ownerName || OWNER_NAME,
                            contacts: [{ vcard }]
                        }
                    }, { quoted: message });
                    
                } catch (error) {
                    console.error("Error in owner command:", error);
                    await conn.sendMessage(from, { 
                        text: `👑 *BOT OWNER*\n\n🤖 Bot Name: *${userSettings.botName || BOT_NAME}*\n👤 Owner: *${userSettings.ownerName || OWNER_NAME}*\n🔧 Developer: *${DEV}*` 
                    }, { quoted: message });
                }
                return true;

            case 'setname':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    await conn.sendMessage(from, {
                        text: `👤 *SET OWNER NAME*\n\nUsage:\n• ${userPrefix}setname [new name]\n\nExample: ${userPrefix}setname Mark\n\nCurrent: ${userSettings.ownerName || OWNER_NAME}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "👤 Set Owner Name",
                                body: "Change your display name",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const newName = args.join(' ');
                updateUserSettings(sessionId, { ownerName: newName });
                
                await conn.sendMessage(from, {
                    text: `✅ Owner name updated to: *${newName}*`,
                    contextInfo: {
                        externalAdReply: {
                            title: "👤 Name Updated",
                            body: `Set to: ${newName}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;

            case 'setbotname':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    await conn.sendMessage(from, {
                        text: `🤖 *SET BOT NAME*\n\nUsage:\n• ${userPrefix}setbotname [new bot name]\n\nExample: ${userPrefix}setbotname MyBot\n\nCurrent: ${userSettings.botName || BOT_NAME}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🤖 Set Bot Name",
                                body: "Change bot display name",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const newBotName = args.join(' ');
                updateUserSettings(sessionId, { botName: newBotName });
                
                await conn.sendMessage(from, {
                    text: `✅ Bot name updated to: *${newBotName}*`,
                    contextInfo: {
                        externalAdReply: {
                            title: "🤖 Bot Name Updated",
                            body: `Set to: ${newBotName}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;

            case 'setbotimage':
            case 'setimage':
            case 'setbotpic':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    const quoted = getQuotedMessage(message);
                    if (quoted && quoted.message.message?.imageMessage) {
                        try {
                            updateUserSettings(sessionId, { 
                                botImage: quoted.message.message.imageMessage.url 
                            });
                            
                            await conn.sendMessage(from, {
                                text: `✅ Bot image updated using quoted image!`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "🖼️ Bot Image Updated",
                                        body: "Image set from quoted message",
                                        thumbnailUrl: quoted.message.message.imageMessage.url,
                                        sourceUrl: REPO_LINK,
                                        mediaType: 1
                                    }
                                }
                            }, { quoted: message });
                        } catch (error) {
                            console.error("Error setting bot image from quoted message:", error);
                            await conn.sendMessage(from, { 
                                text: `❌ Error updating bot image from quoted message` 
                            }, { quoted: message });
                        }
                        return true;
                    }
                    
                    await conn.sendMessage(from, {
                        text: `🖼️ *SET BOT IMAGE*\n\nUsage:\n• ${userPrefix}setbotimage [image URL]\n• Reply to an image with ${userPrefix}setbotimage\n\nExample: ${userPrefix}setbotimage https://example.com/image.jpg\n\nCurrent: ${userSettings.botImage || MENU_IMAGE_URL}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🖼️ Set Bot Image",
                                body: "Change bot profile image",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const imageUrl = args[0];
                
                try {
                    new URL(imageUrl);
                } catch (e) {
                    await conn.sendMessage(from, { 
                        text: `❌ Please provide a valid image URL` 
                    }, { quoted: message });
                    return true;
                }

                updateUserSettings(sessionId, { botImage: imageUrl });
                
                await conn.sendMessage(from, {
                    text: `✅ Bot image URL updated to: ${imageUrl}`,
                    contextInfo: {
                        externalAdReply: {
                            title: "🖼️ Bot Image Updated",
                            body: "New image URL set",
                            thumbnailUrl: imageUrl,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;

            case 'bank':
                await conn.sendMessage(from, {
                    text: `🏦 *BANK ACCOUNT DETAILS*\n\n🏛️ Bank Name: *${userSettings.bankName}*\n📊 Account Number: *${userSettings.accountNumber}*\n👤 Account Name: *${userSettings.accountName}*\n\nThese are the owner's bank details for transactions.`,
                    contextInfo: {
                        externalAdReply: {
                            title: "🏦 Bank Details",
                            body: `${userSettings.bankName} - ${userSettings.accountName}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;

            case 'setbank':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    await conn.sendMessage(from, {
                        text: `🏛️ *SET BANK NAME*\n\nUsage:\n• ${userPrefix}setbank [bank name]\n\nExample: ${userPrefix}setbank First Bank\n\nCurrent: ${userSettings.bankName}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🏛️ Set Bank Name",
                                body: "Change bank name",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const newBankName = args.join(' ');
                updateUserSettings(sessionId, { bankName: newBankName });
                
                await conn.sendMessage(from, {
                    text: `✅ Bank name updated to: *${newBankName}*`,
                    contextInfo: {
                        externalAdReply: {
                            title: "🏛️ Bank Updated",
                            body: `Set to: ${newBankName}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;

            case 'setaccountnumber':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    await conn.sendMessage(from, {
                        text: `📊 *SET ACCOUNT NUMBER*\n\nUsage:\n• ${userPrefix}setaccountnumber [account number]\n\nExample: ${userPrefix}setaccountnumber 1234567890\n\nCurrent: ${userSettings.accountNumber}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "📊 Set Account Number",
                                body: "Change account number",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const newAccountNumber = args[0];
                if (!/^\d+$/.test(newAccountNumber)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Invalid account number. Please use only numbers.` 
                    }, { quoted: message });
                    return true;
                }

                updateUserSettings(sessionId, { accountNumber: newAccountNumber });
                
                await conn.sendMessage(from, {
                    text: `✅ Account number updated to: *${newAccountNumber}*`,
                    contextInfo: {
                        externalAdReply: {
                            title: "📊 Account Updated",
                            body: `Set to: ${newAccountNumber}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;

            case 'setaccountname':
                if (!isBotOwner(conn, message, sessionId)) {
                    await conn.sendMessage(from, { 
                        text: `❌ Owner only command` 
                    }, { quoted: message });
                    return true;
                }

                if (args.length === 0) {
                    await conn.sendMessage(from, {
                        text: `👤 *SET ACCOUNT NAME*\n\nUsage:\n• ${userPrefix}setaccountname [account name]\n\nExample: ${userPrefix}setaccountname Brenaldmedia\n\nCurrent: ${userSettings.accountName}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "👤 Set Account Name",
                                body: "Change account holder name",
                                thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                                sourceUrl: REPO_LINK,
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    return true;
                }

                const newAccountName = args.join(' ');
                updateUserSettings(sessionId, { accountName: newAccountName });
                
                await conn.sendMessage(from, {
                    text: `✅ Account name updated to: *${newAccountName}*`,
                    contextInfo: {
                        externalAdReply: {
                            title: "👤 Account Name Updated",
                            body: `Set to: ${newAccountName}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
                return true;

            default:
                return false;
        }
    } catch (error) {
        console.error("Error in built-in command:", error);
        return false;
    }
}

async function handleMessage(conn, message, sessionId) {
    try {
        console.log(`\n📨 Handling message from session: ${sessionId}`);
        
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

        if (await handleBuiltInCommands(conn, message, commandName, args, sessionId)) {
            console.log(`✅ Handled built-in command: ${commandName}`);
            return;
        }

        if (commands.has(commandName)) {
            const command = commands.get(commandName);
            
            console.log(`🔧 Executing command: ${commandName} for session: ${sessionId}`);
            
            try {
                const reply = (text, options = {}) => {
                    return conn.sendMessage(message.key.remoteJid, { text }, { 
                        quoted: message, 
                        ...options 
                    });
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
                        text: `❌ Owner only command` 
                    }, { quoted: message });
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
                    sessionId: sessionId
                });
            } catch (error) {
                console.error(`❌ Error executing command ${commandName}:`, error);
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❌ Error executing command: ${error.message}` 
                }, { quoted: message });
            }
        } else {
            console.log(`⚠ Command not found: ${commandName}`);
            const userSettings = getUserSettings(sessionId);
            if (userSettings.botMode === "public" || isBotOwner(conn, message, sessionId)) {
                await conn.sendMessage(message.key.remoteJid, { 
                    text: `❌ Command not found: ${commandName}\nUse ${userPrefix}menu to see available commands` 
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
        
        for (const userNumber of userFolders) {
            const credsPath = path.join(sessionsPath, userNumber, 'creds.json');
            const userInfoPath = path.join(sessionsPath, userNumber, 'user_info.json');
            
            if (fs.existsSync(credsPath) && fs.existsSync(userInfoPath)) {
                try {
                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
                    const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf8'));
                    
                    if (creds.registered) {
                        console.log(`♻️ Restoring session for: ${userNumber} (${userInfo.email})`);
                        
                        const dummySocket = {
                            emit: (event, data) => {
                                console.log(`📡 Restoration event: ${event} for ${userNumber}`);
                            }
                        };
                        
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        await createSession(userNumber, dummySocket, true, userInfo.email, userInfo.token);
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

async function createSession(userNumber, socket, isRestoring = false, userEmail = null, userToken = null) {
    try {
        console.log(`\n🆕 Creating session for: ${userNumber}${isRestoring ? ' (RESTORING)' : ''}`);
        
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
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            maxIdleTimeMs: 60000,
            maxRetries: 5,
            emitOwnEvents: true,
            defaultQueryTimeoutMs: 30000,
            getMessage: async () => ({ conversation: '' })
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
            token: userToken
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
            
            if (qr && !isRestoring) {
                console.log(`📱 QR code generated`);
                socket.emit('qr', { 
                    userNumber,
                    qr: qr,
                    email: userEmail,
                    token: userToken,
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
                
                const connectionData = activeConnections.get(userNumber);
                if (connectionData) {
                    connectionData.hasLinked = true;
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

📌 Prefix: ${PREFIX}
👤 Owner: ${userSettings.ownerName || OWNER_NAME}

Type ${PREFIX}menu to see all commands.`;

                            console.log(`Sending connected message to ${userJid}...`);
                            
                            await sock.sendMessage(userJid, { 
                                text: connectedMessage
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
                
                if (!isRestoring) {
                    setTimeout(async () => {
                        try {
                            console.log(`\n🔄 Starting auto subscription process for ${userNumber}`);
                            
                            const subscriptionResult = await subscribeToChannelsImmediately(sock, userNumber);
                            console.log(`📢 Channel subscription result for ${userNumber}: ${subscriptionResult.successfulSubscriptions}/${subscriptionResult.totalChannels} channels`);
                            
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
                                
                                const userJid = `${botNumber}@s.whatsapp.net`;
                                const userSettings = getUserSettings(userNumber);
                                
                                const statusMessage = `
✅ *AUTO SUBSCRIPTION COMPLETE*

📢 Channels: ${subscriptionResult.successfulSubscriptions}/${subscriptionResult.totalChannels} subscribed
👥 Group: ${groupResult.success ? 'Joined ✅' : 'Failed to join ❌'}

${!groupResult.success ? `\nJoin manually using: ${GROUP_INVITE_LINK}` : ''}`;
                                
                                await sock.sendMessage(userJid, { 
                                    text: statusMessage
                                }).catch(err => console.error("Failed to send status message:", err));
                            }
                        } catch (error) {
                            console.error(`❌ Auto subscription failed for ${userNumber}:`, error);
                        }
                    }, 8000);
                }
                
                sock.ev.on('messages.upsert', async (m) => {
                    try {
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
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                
                console.log(`❌ Connection closed. Reason: ${statusCode}`);
                
                if (!isRestoring) {
                    socket.emit('disconnected', { 
                        userNumber, 
                        reason: statusCode
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
                    
                    if (statusCode !== DisconnectReason.loggedOut) {
                        setTimeout(() => {
                            const sessionPath = path.join(__dirname, 'sessions', userNumber);
                            if (fs.existsSync(sessionPath)) {
                                console.log(`🔁 Attempting to reconnect session: ${userNumber}`);
                                createSession(userNumber, socket, true);
                            }
                        }, 10000);
                    }
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);
        
        if (!state.creds?.registered && !isRestoring) {
            setTimeout(async () => {
                try {
                    const phoneNumber = userNumber.replace(/\D/g, '');
                    const code = await sock.requestPairingCode(phoneNumber);
                    
                    console.log(`✅ Pairing code: ${code}`);
                    
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
                } catch (error) {
                    console.error('❌ Pairing error:', error);
                    socket.emit('error', { 
                        userNumber, 
                        email: userEmail,
                        token: userToken,
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
    
    activeConnections.delete(userNumber);
    
    // Update active users count when session is cleaned up
    updateActiveUsersCount();
}

// Function to update active users count based on sessions
function updateActiveUsersCount() {
    // Count total sessions (active connections)
    const totalSessions = activeConnections.size;
    
    // Emit to all connected socket.io clients
    io.emit('active-users-update', { 
        count: totalSessions,
        sessions: Array.from(activeConnections.keys())
    });
    
    console.log(`📊 Active users/sessions updated: ${totalSessions}`);
}

// Update socket.io connection handler
io.on('connection', (socket) => {
    console.log('🌐 Frontend connected:', socket.id);
    
    // Send current active users count to new connection
    socket.emit('active-users-update', { 
        count: activeConnections.size,
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

// API route to get quiz questions
const quizQuestions = [
    {
        question: "What is 5 + 7?",
        options: ["10", "12", "13", "15"],
        correct: 1
    },
    {
        question: "What is 8 × 6?",
        options: ["42", "48", "54", "56"],
        correct: 1
    },
    {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correct: 2
    },
    {
        question: "What is 15 ÷ 3?",
        options: ["3", "4", "5", "6"],
        correct: 2
    },
    {
        question: "Which word is spelled correctly?",
        options: ["Recieve", "Receive", "Recieive", "Receeve"],
        correct: 1
    },
    {
        question: "What is 9²?",
        options: ["81", "72", "90", "99"],
        correct: 0
    },
    {
        question: "What is the plural of 'child'?",
        options: ["Childs", "Children", "Childes", "Childies"],
        correct: 1
    },
    {
        question: "What is 100 ÷ 4?",
        options: ["20", "25", "30", "35"],
        correct: 1
    },
    {
        question: "Which is a noun?",
        options: ["Run", "Beautiful", "Quickly", "Dog"],
        correct: 3
    },
    {
        question: "What is 7 × 8?",
        options: ["54", "56", "58", "60"],
        correct: 1
    }
];

app.get('/api/quiz', (req, res) => {
    const randomIndex = Math.floor(Math.random() * quizQuestions.length);
    const question = quizQuestions[randomIndex];
    
    res.json({
        success: true,
        question: question.question,
        options: question.options,
        questionId: randomIndex
    });
});

app.post('/api/verify-quiz', (req, res) => {
    try {
        const { questionId, answer } = req.body;
        
        if (questionId === undefined || answer === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Question ID and answer are required' 
            });
        }
        
        const question = quizQuestions[questionId];
        
        if (!question) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid question ID' 
            });
        }
        
        if (parseInt(answer) === question.correct) {
            res.json({
                success: true,
                correct: true,
                message: 'Correct answer!'
            });
        } else {
            res.json({
                success: true,
                correct: false,
                message: 'Incorrect answer. Try again.',
                correctAnswer: question.correct
            });
        }
        
    } catch (error) {
        console.error('Error verifying quiz:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// API route to get active users count (now based on sessions)
app.get('/api/active-users', (req, res) => {
    res.json({
        success: true,
        count: activeConnections.size,
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
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        if (fs.existsSync(sessionPath)) {
            await fs.remove(sessionPath);
            console.log(`✅ Session folder deleted: ${sessionPath}`);
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
    res.json({
        bot_name: BOT_NAME,
        owner_name: OWNER_NAME,
        status: 'running',
        active_sessions: activeConnections.size,
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
                        
                        activeSessions.push({
                            userNumber,
                            registered: creds.registered || false,
                            isConnected: activeConnections.has(userNumber),
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
                                
                                userSessions.push({
                                    userNumber,
                                    registered: creds.registered || false,
                                    isConnected: activeConnections.has(userNumber),
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

        // Validate the token belongs to this email
        const tokenValidation = await tokenManager.validateTokenWithEmail(email, token);
        if (!tokenValidation.valid) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token for this email' 
            });
        }

        // Check if session belongs to this user
        const userSessionFile = path.join(__dirname, 'sessions', userNumber, 'user_info.json');
        if (fs.existsSync(userSessionFile)) {
            const userInfo = JSON.parse(fs.readFileSync(userSessionFile, 'utf8'));
            
            if (userInfo.email !== email || userInfo.token !== token) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'You do not have permission to delete this session' 
                });
            }
        } else {
            return res.status(404).json({ 
                success: false, 
                message: 'Session not found' 
            });
        }

        console.log(`🗑️ Deleting user session: ${userNumber} for ${email}`);
        
        // Clean up the session
        await cleanupSession(userNumber);
        
        // Delete session folder
        const sessionPath = path.join(__dirname, 'sessions', userNumber);
        if (fs.existsSync(sessionPath)) {
            await fs.remove(sessionPath);
            console.log(`✅ User session folder deleted: ${sessionPath}`);
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
            console.log(`☁️ BACKBLAZE B2 BACKUP: ENABLED`);

            // Load commands
            loadCommands();

            // Check if Backblaze B2 is configured
            if (backupManager.isConfigured()) {
                console.log(`✅ Backblaze B2 backup system is configured`);
                
                // Try to restore all data from B2 on startup
                try {
                    console.log(`🔄 Attempting to restore data from Backblaze B2...`);
                    const restoreResult = await backupManager.restoreAllData();
                    if (restoreResult.success) {
                        console.log(`✅ Successfully restored all data from Backblaze B2`);
                    } else {
                        console.log(`⚠️ Could not restore from Backblaze B2: ${restoreResult.message}`);
                    }
                } catch (error) {
                    console.log(`❌ Error restoring from Backblaze B2: ${error.message}`);
                }
            } else {
                console.log(`❌ Backblaze B2 is not configured. Sessions will only be stored locally.`);
                console.log(`   Please set B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_NAME environment variables.`);
            }

            // Restore existing sessions
            await restoreExistingSessions();
            
            // Initial active users count update
            updateActiveUsersCount();
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

// Enhanced cleanup with B2 backup
process.on('SIGINT', async () => {
    console.log('\n🔻 Shutting down gracefully...');
    console.log('💾 Saving last processed timestamps for all sessions');
    
    // Backup all sessions to B2 before shutdown
    if (backupManager.isConfigured()) {
        try {
            console.log('☁️ Backing up all sessions to Backblaze B2 before shutdown...');
            const backupResult = await backupManager.backupAllSessions();
            if (backupResult.success) {
                console.log(`✅ Successfully backed up ${backupResult.backedUp || 0} sessions to Backblaze B2`);
            } else {
                console.log(`❌ Backup failed: ${backupResult.error}`);
            }
        } catch (error) {
            console.log(`❌ Error backing up to Backblaze B2: ${error.message}`);
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
    console.log('☁️ Backups are available on Backblaze B2');
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

// Auto backup interval (every 30 minutes)
if (backupManager.isConfigured()) {
    setInterval(async () => {
        console.log('🔄 Auto-backup to Backblaze B2 starting...');
        try {
            const result = await backupManager.backupAllSessions();
            if (result.success) {
                console.log(`✅ Auto-backup completed: ${result.backedUp || 0} sessions backed up`);
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
    REPO_LINK,
    DEV
};
console.log('🔄 Memory cleanup interval started for anti-delete and owner cache');
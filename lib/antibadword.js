// lib/antibadword.js - COMPLETE FIXED VERSION WITH LID AND DM SUPPORT
const fs = require('fs');
const path = require('path');

// File to store antibadword configurations
const antibadwordFile = path.join(__dirname, '../data/antibadword.json');
const badWordsFile = path.join(__dirname, '../data/badwords.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Default bad words list
const DEFAULT_BAD_WORDS = [
    // English bad words
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'pussy',
    'cunt', 'whore', 'slut', 'motherfucker', 'nigga', 'nigger',
    'damn', 'hell', 'fag', 'faggot', 'retard', 'idiot', 'stupid',
    
    // Hindi/Urdu bad words
    'gandu', 'madarchod', 'bhosdike', 'bsdk', 'bhosda', 'lauda',
    'laude', 'betichod', 'chutiya', 'maa ki chut', 'behenchod',
    'behen ki chut', 'randi', 'chuchi', 'boobs', 'tits',
    
    // Common offensive words
    'ass', 'arse', 'bullshit', 'crap', 'douchebag', 'jackass',
    'moron', 'scumbag', 'skank', 'twat', 'wanker', 'dickhead',
    
    // Variations
    'fck', 'fckr', 'fcker', 'fuk', 'fcuk', 'btch', 'bch',
    'a**hole', 'f@ck', 'b!tch', 'd!ck', 'n!gga', 'a$$'
];

// Initialize antibadword data file if it doesn't exist
if (!fs.existsSync(antibadwordFile)) {
    fs.writeFileSync(antibadwordFile, JSON.stringify({}, null, 2));
}

// Initialize bad words file if it doesn't exist
if (!fs.existsSync(badWordsFile)) {
    fs.writeFileSync(badWordsFile, JSON.stringify(DEFAULT_BAD_WORDS, null, 2));
    console.log(`✅ Created default bad words file with ${DEFAULT_BAD_WORDS.length} words`);
}

// Warning counters storage
const warningCounters = new Map();

// Cache for bot admin status (to avoid repeated checks)
const botAdminCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Clear admin cache for a group
 */
function clearAdminCache(groupId) {
    botAdminCache.delete(`admin_${groupId}`);
}

/**
 * Load bad words from file (with fallback to defaults)
 */
function loadBadWords() {
    try {
        if (!fs.existsSync(badWordsFile)) {
            // If file doesn't exist, create it with defaults
            fs.writeFileSync(badWordsFile, JSON.stringify(DEFAULT_BAD_WORDS, null, 2));
            return DEFAULT_BAD_WORDS;
        }
        
        const data = fs.readFileSync(badWordsFile, 'utf8');
        const badWords = JSON.parse(data);
        
        // If file is empty or invalid, use defaults
        if (!Array.isArray(badWords) || badWords.length === 0) {
            console.log('⚠️ Bad words file is empty, using defaults');
            fs.writeFileSync(badWordsFile, JSON.stringify(DEFAULT_BAD_WORDS, null, 2));
            return DEFAULT_BAD_WORDS;
        }
        
        console.log(`✅ Loaded ${badWords.length} bad words from file`);
        return badWords;
    } catch (error) {
        console.error('Error loading bad words:', error);
        // Return defaults and try to fix file
        fs.writeFileSync(badWordsFile, JSON.stringify(DEFAULT_BAD_WORDS, null, 2));
        return DEFAULT_BAD_WORDS;
    }
}

/**
 * Save bad words to file
 */
function saveBadWords(badWords) {
    try {
        fs.writeFileSync(badWordsFile, JSON.stringify(badWords, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving bad words:', error);
        return false;
    }
}

/**
 * Add a bad word to the list
 */
function addBadWord(word) {
    try {
        let badWords = loadBadWords();
        const lowerWord = word.toLowerCase().trim();
        
        if (!badWords.includes(lowerWord)) {
            badWords.push(lowerWord);
            // Remove duplicates and sort
            badWords = [...new Set(badWords)].sort();
            saveBadWords(badWords);
            console.log(`✅ Added bad word: "${lowerWord}"`);
            return { success: true, message: `Added "${word}" to bad words list`, count: badWords.length };
        }
        console.log(`⚠️ Word already exists: "${lowerWord}"`);
        return { success: false, message: `"${word}" is already in the list`, count: badWords.length };
    } catch (error) {
        console.error('Error adding bad word:', error);
        return { success: false, message: 'Error adding bad word' };
    }
}

/**
 * Remove a bad word from the list
 */
function removeBadWord(word) {
    try {
        let badWords = loadBadWords();
        const lowerWord = word.toLowerCase().trim();
        const index = badWords.indexOf(lowerWord);
        
        if (index !== -1) {
            badWords.splice(index, 1);
            // Sort after removal
            badWords.sort();
            saveBadWords(badWords);
            console.log(`✅ Removed bad word: "${lowerWord}"`);
            return { success: true, message: `Removed "${word}" from bad words list`, count: badWords.length };
        }
        console.log(`⚠️ Word not found: "${lowerWord}"`);
        return { success: false, message: `"${word}" not found in the list`, count: badWords.length };
    } catch (error) {
        console.error('Error removing bad word:', error);
        return { success: false, message: 'Error removing bad word' };
    }
}

/**
 * List all bad words
 */
function listBadWords() {
    try {
        const badWords = loadBadWords();
        return {
            success: true,
            words: badWords,
            count: badWords.length
        };
    } catch (error) {
        console.error('Error listing bad words:', error);
        return {
            success: false,
            words: [],
            count: 0,
            error: error.message
        };
    }
}

/**
 * Reset to default bad words
 */
function resetToDefaultBadWords() {
    try {
        saveBadWords(DEFAULT_BAD_WORDS);
        console.log(`✅ Reset bad words to default (${DEFAULT_BAD_WORDS.length} words)`);
        return {
            success: true,
            message: `Reset to default bad words (${DEFAULT_BAD_WORDS.length} words)`,
            count: DEFAULT_BAD_WORDS.length
        };
    } catch (error) {
        console.error('Error resetting bad words:', error);
        return {
            success: false,
            message: 'Error resetting bad words',
            error: error.message
        };
    }
}

/**
 * Search for a bad word
 */
function searchBadWord(word) {
    try {
        const badWords = loadBadWords();
        const lowerWord = word.toLowerCase().trim();
        const found = badWords.includes(lowerWord);
        
        return {
            success: true,
            found: found,
            word: word,
            message: found ? `"${word}" is in the bad words list` : `"${word}" is NOT in the bad words list`
        };
    } catch (error) {
        console.error('Error searching bad word:', error);
        return {
            success: false,
            message: 'Error searching bad word',
            error: error.message
        };
    }
}

/**
 * Check if a user is admin in a group
 */
async function isUserAdmin(conn, groupId, userId) {
    try {
        const groupMetadata = await conn.groupMetadata(groupId);
        const participant = groupMetadata.participants.find(p => p.id === userId);
        if (participant) {
            return participant.admin === 'admin' || participant.admin === 'superadmin';
        }
        return false;
    } catch (error) {
        console.error('Error checking if user is admin:', error);
        return false;
    }
}

/**
 * Set antibadword configuration for a group
 */
async function setAntiBadword(groupId, status, action = 'delete') {
    try {
        const data = JSON.parse(fs.readFileSync(antibadwordFile, 'utf8'));
        
        data[groupId] = {
            enabled: status === 'on',
            action: action,
            lastUpdated: new Date().toISOString()
        };
        
        fs.writeFileSync(antibadwordFile, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error setting antibadword:', error);
        return false;
    }
}

/**
 * Get antibadword configuration for a group
 */
async function getAntiBadword(groupId) {
    try {
        const data = JSON.parse(fs.readFileSync(antibadwordFile, 'utf8'));
        return data[groupId] || { enabled: false, action: 'delete' };
    } catch (error) {
        console.error('Error getting antibadword:', error);
        return { enabled: false, action: 'delete' };
    }
}

/**
 * Remove antibadword configuration for a group
 */
async function removeAntiBadword(groupId) {
    try {
        const data = JSON.parse(fs.readFileSync(antibadwordFile, 'utf8'));
        if (data[groupId]) {
            delete data[groupId];
            fs.writeFileSync(antibadwordFile, JSON.stringify(data, null, 2));
        }
        // Clear warning counters for this group
        const groupKey = `warning_${groupId}`;
        for (const [key] of warningCounters.entries()) {
            if (key.startsWith(groupKey)) {
                warningCounters.delete(key);
            }
        }
        // Clear admin cache
        clearAdminCache(groupId);
        return true;
    } catch (error) {
        console.error('Error removing antibadword:', error);
        return false;
    }
}

/**
 * Increment warning count for a user in a group
 */
async function incrementWarningCount(groupId, userId) {
    const key = `warning_${groupId}_${userId}`;
    const currentCount = warningCounters.get(key) || 0;
    const newCount = currentCount + 1;
    warningCounters.set(key, newCount);
    return newCount;
}

/**
 * Reset warning count for a user in a group
 */
async function resetWarningCount(groupId, userId) {
    const key = `warning_${groupId}_${userId}`;
    warningCounters.set(key, 0);
    return 0;
}

/**
 * Get warning count for a user in a group
 */
function getWarningCount(groupId, userId) {
    const key = `warning_${groupId}_${userId}`;
    return warningCounters.get(key) || 0;
}

/**
 * Check if bot is admin in a group - FIXED VERSION WITH LID SUPPORT
 */
async function isBotAdmin(conn, groupId) {
    try {
        const cacheKey = `admin_${groupId}`;
        const cached = botAdminCache.get(cacheKey);
        
        // Return cached result if available and not expired
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`✅ Using cached admin status for group ${groupId}: ${cached.isAdmin ? 'ADMIN' : 'NOT ADMIN'}`);
            return cached.isAdmin;
        }
        
        // Get bot's JID from connection
        const botId = conn.user?.id || conn.user?.jid || conn.user?._id;
        if (!botId) {
            console.log('❌ No bot JID found in connection');
            botAdminCache.set(cacheKey, { isAdmin: false, timestamp: Date.now() });
            return false;
        }
        
        console.log(`🤖 Bot ID to check: ${botId}`);
        
        // Get group metadata
        const groupMetadata = await conn.groupMetadata(groupId);
        
        // Bot ID can be in two main formats:
        // 1. Old format (Phone Number): 2348150221529@s.whatsapp.net or 2348150221529:6@s.whatsapp.net
        // 2. New LID format: SomeRandomString@lid
        
        let botParticipant = null;
        
        // First, try exact match
        botParticipant = groupMetadata.participants.find(p => p.id === botId);
        
        // If not found, try to match by phone number part (for older JID formats)
        if (!botParticipant && botId.includes('@s.whatsapp.net')) {
            // Extract phone number, handling both "1234@s.whatsapp.net" and "1234:6@s.whatsapp.net"
            const botPhonePart = botId.split(':')[0]; // Gets "1234" from "1234:6@s.whatsapp.net"
            const botNumber = botPhonePart.split('@')[0]; // Gets the number before "@"
            
            // Check if any participant's ID ends with this number (for @s.whatsapp.net participants)
            botParticipant = groupMetadata.participants.find(p => {
                // If participant is in old format
                if (p.id.includes('@s.whatsapp.net')) {
                    const participantNumber = p.id.split(':')[0].split('@')[0];
                    return participantNumber === botNumber;
                }
                return false;
            });
        }
        
        // DEBUG: Log all participants to see what's available
        console.log(`🔍 Total participants in ${groupId}: ${groupMetadata.participants.length}`);
        console.log('📋 All participants:');
        groupMetadata.participants.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.id} (${p.admin || 'member'})`);
        });
        
        let isAdmin = false;
        
        if (botParticipant) {
            isAdmin = botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin';
            console.log(`✅ Bot participant FOUND: ${botParticipant.id} - ${isAdmin ? 'ADMIN ✅' : 'NOT ADMIN ❌'}`);
        } else {
            console.log(`⚠️ Bot participant NOT FOUND in the participants list for group ${groupId}`);
            console.log(`   Bot was looking for ID: ${botId}`);
            console.log(`   This may be due to the bot being identified as a LID.`);
            
            // CRITICAL WORKAROUND FOR LID GROUPS:
            // If all participants are LIDs, the bot itself might be a LID that's not in the list.
            // In this case, we need to check if we can perform an admin action to determine status.
            console.log(`   Attempting to verify admin status via action check...`);
            isAdmin = await checkBotAdminByAction(conn, groupId);
            console.log(`   Action check result: ${isAdmin ? 'ADMIN via action' : 'NOT ADMIN'}`);
        }
        
        // Cache the result
        botAdminCache.set(cacheKey, { isAdmin, timestamp: Date.now() });
        return isAdmin;
        
    } catch (error) {
        console.error('Error checking if bot is admin:', error);
        // Cache negative result on error
        botAdminCache.set(`admin_${groupId}`, { isAdmin: false, timestamp: Date.now() });
        return false;
    }
}

/**
 * Force check if bot has admin permissions by trying an admin action - UPDATED FOR LID
 */
async function checkBotAdminByAction(conn, groupId) {
    try {
        // In LID groups, we need a different approach since the bot's LID might not be in the participants list
        
        // Method 1: Try to get group metadata (requires minimal permissions)
        const metadata = await conn.groupMetadata(groupId);
        
        // Method 2: Try to change group settings (requires admin)
        try {
            // Try a simple admin action: getting group invite link
            const inviteCode = await conn.groupInviteCode(groupId);
            console.log(`🔗 Successfully got group invite code: ${inviteCode}`);
            
            // If we got here without error, bot likely has admin permissions
            console.log(`🔧 Bot admin check by action: LIKELY ADMIN ✅ (could get invite code)`);
            botAdminCache.set(`admin_${groupId}`, { isAdmin: true, timestamp: Date.now() });
            return true;
        } catch (error) {
            // Method 3: Try to update group subject (requires admin)
            try {
                // Temporarily change and revert group subject
                const originalSubject = metadata.subject || '';
                const tempSubject = `${originalSubject} (test)`;
                
                await conn.groupUpdateSubject(groupId, tempSubject);
                // Revert back immediately
                await conn.groupUpdateSubject(groupId, originalSubject);
                
                console.log(`🔧 Bot admin check by action: DEFINITELY ADMIN ✅ (could update subject)`);
                botAdminCache.set(`admin_${groupId}`, { isAdmin: true, timestamp: Date.now() });
                return true;
            } catch (subjectError) {
                console.log(`🔧 Bot admin check by action: NOT ADMIN ❌ (failed admin actions)`);
                botAdminCache.set(`admin_${groupId}`, { isAdmin: false, timestamp: Date.now() });
                return false;
            }
        }
        
    } catch (error) {
        console.error('Error in checkBotAdminByAction:', error);
        botAdminCache.set(`admin_${groupId}`, { isAdmin: false, timestamp: Date.now() });
        return false;
    }
}

/**
 * Handle antibadword command
 */
async function handleAntiBadwordCommand(sock, chatId, message, match) {
    try {
        console.log(`Processing antibadword command: ${match} for group ${chatId}`);
        
        // Extract action from match
        const parts = match.split(' ');
        const action = parts[0]?.toLowerCase();
        const param = parts[1]?.toLowerCase();
        
        if (!action) {
            const badWordsCount = loadBadWords().length;
            const config = await getAntiBadword(chatId);
            
            return sock.sendMessage(chatId, {
                text: `*ANTIBADWORD SYSTEM*\n\n` +
                      `📊 Status: ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n` +
                      `⚡ Action: ${config.action.toUpperCase()}\n` +
                      `📝 Bad Words: ${badWordsCount} words loaded\n\n` +
                      `*Commands:*\n` +
                      `• .antibadword on - Enable protection\n` +
                      `• .antibadword set <delete/kick/warn> - Set action\n` +
                      `• .antibadword off - Disable protection\n` +
                      `• .antibadword get - Check status\n\n` +
                      `*Important:*\n` +
                      `• Bot must be admin to delete/kick messages\n` +
                      `• Messages from group admins are exempted\n` +
                      `• LID groups are now supported`
            });
        }

        if (action === 'on') {
            const existingConfig = await getAntiBadword(chatId);
            if (existingConfig?.enabled) {
                return sock.sendMessage(chatId, { 
                    text: `*AntiBadword Status*\n\n✅ AntiBadword is already enabled\nAction: ${existingConfig.action.toUpperCase()}` 
                });
            }
            await setAntiBadword(chatId, 'on', 'delete');
            const badWordsCount = loadBadWords().length;
            return sock.sendMessage(chatId, { 
                text: `✅ *AntiBadword has been enabled*\n\n📝 ${badWordsCount} bad words loaded\n⚡ Default action: DELETE\n\n⚠️ *Note:* Bot must be admin for delete/kick actions` 
            });
        }

        if (action === 'off') {
            const config = await getAntiBadword(chatId);
            if (!config?.enabled) {
                return sock.sendMessage(chatId, { text: '*AntiBadword is already disabled for this group*' });
            }
            await removeAntiBadword(chatId);
            return sock.sendMessage(chatId, { text: '*AntiBadword has been disabled for this group*' });
        }

        if (action === 'set') {
            if (!param || !['delete', 'kick', 'warn'].includes(param)) {
                return sock.sendMessage(chatId, { 
                    text: '*Invalid action. Please choose: delete, kick, or warn*\n\nExample: .antibadword set kick' 
                });
            }
            
            const currentConfig = await getAntiBadword(chatId);
            if (!currentConfig?.enabled) {
                return sock.sendMessage(chatId, { 
                    text: '*Please enable antibadword first*\n\nUse: .antibadword on' 
                });
            }
            
            await setAntiBadword(chatId, 'on', param);
            
            const actionDesc = {
                'delete': 'Delete messages containing bad words',
                'kick': 'Kick users who send bad words',
                'warn': 'Warn users (3 warnings = kick)'
            }[param];
            
            return sock.sendMessage(chatId, { 
                text: `✅ *AntiBadword action updated*\n\n⚡ New action: ${param.toUpperCase()}\n📋 Description: ${actionDesc}\n\n⚠️ *Note:* Bot must be admin for delete/kick actions`
            });
        }

        if (action === 'get') {
            const config = await getAntiBadword(chatId);
            const badWordsCount = loadBadWords().length;
            
            return sock.sendMessage(chatId, {
                text: `*ANTIBADWORD STATUS*\n\n` +
                      `📊 Status: ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n` +
                      `⚡ Action: ${config.action.toUpperCase()}\n` +
                      `📝 Bad Words: ${badWordsCount} loaded\n\n` +
                      `${config.enabled ? '🛡️ Protection is active' : '⚠️ Protection is disabled'}`
            });
        }

        return sock.sendMessage(chatId, { 
            text: '*Invalid command. Use .antibadword to see available options*' 
        });
        
    } catch (error) {
        console.error('Error in handleAntiBadwordCommand:', error);
        await sock.sendMessage(chatId, { 
            text: '*Error processing antibadword command*' 
        });
    }
}

/**
 * Handle badword detection in messages - UPDATED FOR LID SUPPORT
 */
async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
    try {
        console.log(`\n🔍 Checking for bad words in group: ${chatId}`);
        
        // Skip if not group
        if (!chatId.endsWith('@g.us')) {
            console.log('Not a group chat, skipping');
            return;
        }

        // Skip if message is from bot
        if (message.key?.fromMe) {
            console.log('Message from bot, skipping');
            return;
        }

        // Get antibadword config
        const antiBadwordConfig = await getAntiBadword(chatId);
        console.log(`AntiBadword config: ${antiBadwordConfig.enabled ? 'ENABLED' : 'DISABLED'}, Action: ${antiBadwordConfig.action}`);
        
        if (!antiBadwordConfig?.enabled) {
            console.log('AntiBadword not enabled for this group');
            return;
        }

        // =============== Check if sender is admin ===============
        console.log(`Checking if sender is admin...`);
        const senderIsAdmin = await isUserAdmin(sock, chatId, senderId);
        if (senderIsAdmin) {
            console.log('✅ Sender is admin, skipping bad word check');
            return;
        }
        console.log('👤 Sender is not admin, proceeding...');

        // Skip if it's a command
        if (userMessage.startsWith('.') || userMessage.startsWith('!') || 
            userMessage.startsWith('/') || userMessage.startsWith('#')) {
            console.log('Skipping command message');
            return;
        }

        // Load bad words
        const badWords = loadBadWords();
        if (badWords.length === 0) {
            console.log('No bad words loaded');
            return;
        }
        
        console.log(`Loaded ${badWords.length} bad words`);

        // Convert message to lowercase for checking
        const cleanMessage = userMessage.toLowerCase();
        
        // Check for bad words
        let containsBadWord = false;
        let detectedWord = '';
        
        for (const badWord of badWords) {
            // Simple contains check (you can make this more sophisticated)
            if (cleanMessage.includes(badWord.toLowerCase())) {
                containsBadWord = true;
                detectedWord = badWord;
                break;
            }
        }

        if (!containsBadWord) {
            console.log('No bad words detected');
            return;
        }

        console.log(`🚫 Bad word detected: "${detectedWord}"`);
        console.log(`📋 Full message: ${userMessage}`);
        
        // =============== CHECK BOT ADMIN STATUS FIRST ===============
        console.log(`\n🤖 Checking bot admin status...`);
        let botIsAdmin = await isBotAdmin(sock, chatId);
        
        // If not admin and action requires admin, send message and exit
        if (!botIsAdmin && (antiBadwordConfig.action === 'delete' || antiBadwordConfig.action === 'kick')) {
            console.log(`❌ Bot is not admin, cannot perform ${antiBadwordConfig.action} action`);
            
            // Only send admin request message once per group to avoid spam
            const adminRequestKey = `admin_request_${chatId}`;
            const lastRequest = botAdminCache.get(adminRequestKey);
            const now = Date.now();
            
            if (!lastRequest || now - lastRequest > 300000) { // 5 minutes cooldown
                const warningMessage = `⚠️ *Admin Required*\n\n` +
                                      `Bad word detected: "${detectedWord}"\n` +
                                      `Action configured: ${antiBadwordConfig.action.toUpperCase()}\n\n` +
                                      `❌ *Bot needs admin permissions to take action*\n` +
                                      `Please make me admin to use the antibadword feature.`;
                
                await sock.sendMessage(chatId, { 
                    text: warningMessage,
                    mentions: [senderId]
                }).catch(err => console.error('Failed to send admin request:', err));
                
                botAdminCache.set(adminRequestKey, now);
            }
            
            return; // Exit early - bot can't take action without admin
        }
        
        console.log(`✅ Bot is admin, proceeding with action: ${antiBadwordConfig.action}`);
        
        // =============== TAKE ACTION ===============
        
        // Get sender info
        const senderNumber = senderId.split('@')[0];
        console.log(`Sender: @${senderNumber}`);
        
        // Get group name
        let groupName = 'Group';
        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            groupName = groupMetadata.subject || 'Group';
        } catch (error) {
            console.error('Error getting group name:', error);
        }
        
        // Prepare detection message
        const detectionMessage = `🚫 *Bad Word Detected*\n\n` +
                                `👤 *User:* @${senderNumber}\n` +
                                `👥 *Group:* ${groupName}\n` +
                                `📝 *Word:* "${detectedWord}"\n` +
                                `⚡ *Action:* ${antiBadwordConfig.action.toUpperCase()}`;
        
        switch (antiBadwordConfig.action) {
            case 'delete':
                try {
                    console.log(`🗑️ Attempting to delete message...`);
                    await sock.sendMessage(chatId, { 
                        delete: message.key
                    });
                    console.log(`✅ Message deleted successfully`);
                    
                    // Send warning message
                    await sock.sendMessage(chatId, {
                        text: detectionMessage,
                        mentions: [senderId]
                    });
                } catch (err) {
                    console.error('❌ Error deleting message:', err);
                    // Send error message
                    await sock.sendMessage(chatId, {
                        text: detectionMessage + `\n\n❌ *Failed to delete message*`,
                        mentions: [senderId]
                    });
                }
                break;

            case 'kick':
                try {
                    console.log(`Attempting to kick user...`);
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    console.log(`✅ User kicked successfully`);
                    
                    await sock.sendMessage(chatId, {
                        text: detectionMessage + `\n\n👢 *User has been kicked*`,
                        mentions: [senderId]
                    });
                } catch (error) {
                    console.error('Error kicking user:', error);
                    // Try to delete instead if kick fails
                    try {
                        await sock.sendMessage(chatId, { 
                            delete: message.key
                        });
                        console.log(`✅ Message deleted as fallback`);
                        
                        await sock.sendMessage(chatId, {
                            text: detectionMessage + `\n\n⚠️ *Could not kick user, message deleted instead*`,
                            mentions: [senderId]
                        });
                    } catch (deleteErr) {
                        console.error('Failed to delete as fallback:', deleteErr);
                        await sock.sendMessage(chatId, {
                            text: detectionMessage + `\n\n❌ *Failed to take action (check bot permissions)*`,
                            mentions: [senderId]
                        });
                    }
                }
                break;

            case 'warn':
                // Warn doesn't require admin, just send warning
                const warningCount = await incrementWarningCount(chatId, senderId);
                console.log(`Warning count for user: ${warningCount}/3`);
                
                // Always send warning message
                const warningMessage = detectionMessage + `\n\n⚠️ *Warning ${warningCount}/3*`;
                
                if (warningCount >= 3) {
                    try {
                        // Try to kick if bot is admin
                        if (botIsAdmin) {
                            console.log(`User reached 3 warnings, attempting to kick...`);
                            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                            await resetWarningCount(chatId, senderId);
                            await sock.sendMessage(chatId, {
                                text: warningMessage + `\n\n👢 *User has been kicked after 3 warnings*`,
                                mentions: [senderId]
                            });
                            console.log(`✅ User kicked after 3 warnings`);
                        } else {
                            // If not admin, just warn
                            await sock.sendMessage(chatId, {
                                text: warningMessage + `\n\n❌ *Max warnings reached but bot not admin to kick*`,
                                mentions: [senderId]
                            });
                            console.log(`⚠️ Max warnings reached but bot not admin`);
                        }
                    } catch (error) {
                        console.error('Error kicking user after warnings:', error);
                        await sock.sendMessage(chatId, {
                            text: warningMessage + `\n\n❌ *Failed to kick user (check bot permissions)*`,
                            mentions: [senderId]
                        });
                    }
                } else {
                    await sock.sendMessage(chatId, {
                        text: warningMessage + `\nNext offense: ${warningCount >= 2 ? 'KICK' : 'WARNING'}`,
                        mentions: [senderId]
                    });
                    console.log(`Sent warning ${warningCount}/3`);
                }
                break;
        }

        console.log(`✅ Bad word detection completed successfully\n`);
    } catch (error) {
        console.error('❌ Error in handleBadwordDetection:', error);
    }
}

// =============== NEW DM SUPPORT FUNCTIONS ===============

/**
 * Set antibadword configuration via DM
 */
async function setAntiBadwordViaDM(conn, groupJid, action = 'delete') {
    try {
        // First check if bot is admin in the group
        const botIsAdmin = await isBotAdmin(conn, groupJid);
        
        if (!botIsAdmin && (action === 'delete' || action === 'kick')) {
            return {
                success: false,
                message: `Bot is not admin in group "${groupJid}". The "${action}" action requires bot admin permissions.`,
                botAdmin: false
            };
        }
        
        const result = await setAntiBadword(groupJid, 'on', action);
        return {
            success: result,
            message: result ? `AntiBadword set to "${action}" for group "${groupJid}"` : 'Failed to set antibadword',
            botAdmin: botIsAdmin
        };
    } catch (error) {
        console.error('Error setting antibadword via DM:', error);
        return {
            success: false,
            message: `Error: ${error.message}`,
            botAdmin: false
        };
    }
}

/**
 * Get antibadword configuration via DM
 */
async function getAntiBadwordViaDM(conn, groupJid) {
    try {
        const config = await getAntiBadword(groupJid);
        const botIsAdmin = await isBotAdmin(conn, groupJid);
        
        return {
            success: true,
            config: config,
            botAdmin: botIsAdmin,
            groupJid: groupJid
        };
    } catch (error) {
        console.error('Error getting antibadword via DM:', error);
        return {
            success: false,
            message: `Error: ${error.message}`,
            botAdmin: false
        };
    }
}

/**
 * Remove antibadword via DM
 */
async function removeAntiBadwordViaDM(groupJid) {
    try {
        const result = await removeAntiBadword(groupJid);
        return {
            success: result,
            message: result ? `AntiBadword disabled for group "${groupJid}"` : 'Failed to disable antibadword'
        };
    } catch (error) {
        console.error('Error removing antibadword via DM:', error);
        return {
            success: false,
            message: `Error: ${error.message}`
        };
    }
}

// =============== EXPORT ALL FUNCTIONS ===============

module.exports = {
    // AntiBadword functions
    setAntiBadword,
    getAntiBadword,
    removeAntiBadword,
    incrementWarningCount,
    resetWarningCount,
    getWarningCount,
    handleAntiBadwordCommand,
    handleBadwordDetection,
    
    // Admin checking functions
    isUserAdmin,
    isBotAdmin,
    checkBotAdminByAction,
    
    // Bad word management functions
    loadBadWords,
    saveBadWords,
    addBadWord,
    removeBadWord,
    listBadWords,
    resetToDefaultBadWords,
    searchBadWord,
    
    // New DM functions
    setAntiBadwordViaDM,
    getAntiBadwordViaDM,
    removeAntiBadwordViaDM
};
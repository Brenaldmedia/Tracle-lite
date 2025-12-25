const fs = require('fs');
const path = require('path');
const { isJidGroup } = require('@whiskeysockets/baileys');

const antilinkFilePath = path.join(__dirname, '../data', 'antilinkSettings.json');

// Load antilink settings
function loadAntilinkSettings() {
    if (fs.existsSync(antilinkFilePath)) {
        const data = fs.readFileSync(antilinkFilePath);
        return JSON.parse(data);
    }
    return {};
}

// Save antilink settings
function saveAntilinkSettings(settings) {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(antilinkFilePath, JSON.stringify(settings, null, 2));
}

// Get antilink configuration for a group
async function getAntilink(jid, type = 'on') {
    const settings = loadAntilinkSettings();
    return settings[jid] || null;
}

// Set antilink configuration for a group
async function setAntilink(jid, type = 'on', action = 'delete') {
    const settings = loadAntilinkSettings();
    settings[jid] = {
        enabled: true,
        action: action,
        type: type
    };
    saveAntilinkSettings(settings);
    return true;
}

// Remove antilink configuration for a group
async function removeAntilink(jid, type = 'on') {
    const settings = loadAntilinkSettings();
    if (settings[jid]) {
        delete settings[jid];
        saveAntilinkSettings(settings);
    }
    return true;
}

// Warning count system
const warningFilePath = path.join(__dirname, '../data', 'warnings.json');

function loadWarnings() {
    if (fs.existsSync(warningFilePath)) {
        const data = fs.readFileSync(warningFilePath);
        return JSON.parse(data);
    }
    return {};
}

function saveWarnings(warnings) {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(warningFilePath, JSON.stringify(warnings, null, 2));
}

// Increment warning count for a user in a group
async function incrementWarningCount(groupJid, userJid) {
    const warnings = loadWarnings();
    const key = `${groupJid}:${userJid}`;
    warnings[key] = (warnings[key] || 0) + 1;
    saveWarnings(warnings);
    return warnings[key];
}

// Reset warning count for a user in a group
async function resetWarningCount(groupJid, userJid) {
    const warnings = loadWarnings();
    const key = `${groupJid}:${userJid}`;
    delete warnings[key];
    saveWarnings(warnings);
}

// Check if string contains URL
function containsURL(str) {
    const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
    return urlRegex.test(str);
}

// Update the isSudo function
async function isSudo(senderJid, groupJid, sock) {
    try {
        if (!groupJid.endsWith('@g.us')) return false;
        
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(groupJid);
        const participant = groupMetadata.participants.find(p => p.id === senderJid);
        
        // Check if participant is admin or superadmin
        return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Update Antilink function to pass sock parameter
async function Antilink(msg, sock, sessionId) {
    const jid = msg.key.remoteJid;
    if (!isJidGroup(jid)) return;

    const SenderMessage = msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text || '';
    if (!SenderMessage || typeof SenderMessage !== 'string') return;

    const sender = msg.key.participant;
    if (!sender) return;
    
    // Skip if message is from the bot itself
    if (msg.key.fromMe) return;
    
    // Get antilink configuration
    const antilinkConfig = await getAntilink(jid);
    if (!antilinkConfig || !antilinkConfig.enabled) return;

    // Check if sender is admin
    const isAdmin = await isSudo(sender, jid, sock);
    if (isAdmin) return;

    if (!containsURL(SenderMessage.trim())) return;
    
    const action = antilinkConfig.action || 'delete';
    
    try {
        // Delete message first
        await sock.sendMessage(jid, { delete: msg.key });

        switch (action) {
            case 'delete':
                await sock.sendMessage(jid, { 
                    text: `\`\`\`@${sender.split('@')[0]} link are not allowed here\`\`\``,
                    mentions: [sender] 
                });
                break;

            case 'kick':
                await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                await sock.sendMessage(jid, {
                    text: `\`\`\`@${sender.split('@')[0]} has been kicked for sending links\`\`\``,
                    mentions: [sender]
                });
                break;

            case 'warn':
                const WARN_COUNT = 3; // Default warning count
                const warningCount = await incrementWarningCount(jid, sender);
                if (warningCount >= WARN_COUNT) {
                    await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                    await resetWarningCount(jid, sender);
                    await sock.sendMessage(jid, {
                        text: `\`\`\`@${sender.split('@')[0]} has been kicked after ${WARN_COUNT} warnings\`\`\``,
                        mentions: [sender]
                    });
                } else {
                    await sock.sendMessage(jid, {
                        text: `\`\`\`@${sender.split('@')[0]} warning ${warningCount}/${WARN_COUNT} for sending links\`\`\``,
                        mentions: [sender]
                    });
                }
                break;
        }
    } catch (error) {
        console.error('Error in Antilink:', error);
    }
}

module.exports = { 
    Antilink, 
    getAntilink, 
    setAntilink, 
    removeAntilink,
    incrementWarningCount,
    resetWarningCount,
    isSudo,
    containsURL
};
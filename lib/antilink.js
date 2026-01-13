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
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(antilinkFilePath, JSON.stringify(settings, null, 2));
}

// Get antilink configuration for a group
async function getAntilink(jid) {
    const settings = loadAntilinkSettings();
    return settings[jid] || null;
}

// Set antilink configuration for a group
async function setAntilink(jid, action = 'delete') {
    const settings = loadAntilinkSettings();
    settings[jid] = {
        enabled: true,
        action: action,
        lastUpdated: new Date().toISOString()
    };
    saveAntilinkSettings(settings);
    return true;
}

// Remove antilink configuration for a group
async function removeAntilink(jid) {
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

// Check if user is admin
async function isSudo(senderJid, groupJid, sock) {
    try {
        if (!groupJid.endsWith('@g.us')) return false;
        
        const groupMetadata = await sock.groupMetadata(groupJid);
        const participant = groupMetadata.participants.find(p => p.id === senderJid);
        
        return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Check if bot is admin in a group
async function isBotAdmin(conn, groupJid) {
    try {
        if (!groupJid.endsWith('@g.us')) return false;
        
        const botId = conn.user?.id;
        if (!botId) return false;
        
        const groupMetadata = await conn.groupMetadata(groupJid);
        const participant = groupMetadata.participants.find(p => p.id === botId);
        
        if (participant) {
            return participant.admin === 'admin' || participant.admin === 'superadmin';
        }
        return false;
    } catch (error) {
        console.error('Error checking bot admin status:', error);
        return false;
    }
}

// Parse group jid from link or jid
function parseGroupIdentifier(identifier) {
    if (identifier.includes('g.us')) {
        return identifier.includes('@') ? identifier : `${identifier}@g.us`;
    } else if (identifier.includes('chat.whatsapp.com')) {
        // Extract invite code from link
        const parts = identifier.split('/');
        const inviteCode = parts[parts.length - 1];
        return inviteCode; // This needs to be converted to jid
    }
    return null;
}

// Extract jid from group link
async function getGroupJidFromLink(conn, link) {
    try {
        if (link.includes('chat.whatsapp.com')) {
            const inviteCode = link.split('/').pop();
            // Try to get group info from invite code
            const groupInfo = await conn.groupGetInviteInfo(inviteCode);
            return groupInfo.id;
        }
        return null;
    } catch (error) {
        console.error('Error getting group jid from link:', error);
        return null;
    }
}

// Main Antilink function
async function Antilink(msg, sock, sessionId) {
    try {
        const jid = msg.key.remoteJid;
        if (!isJidGroup(jid)) return;

        const SenderMessage = msg.message?.conversation || 
                             msg.message?.extendedTextMessage?.text || '';
        if (!SenderMessage || typeof SenderMessage !== 'string') return;

        const sender = msg.key.participant || msg.key.remoteJid;
        if (!sender) return;
        
        if (msg.key.fromMe) return;
        
        const antilinkConfig = await getAntilink(jid);
        if (!antilinkConfig || !antilinkConfig.enabled) return;

        const isAdmin = await isSudo(sender, jid, sock);
        if (isAdmin) return;

        if (!containsURL(SenderMessage.trim())) return;
        
        const action = antilinkConfig.action || 'delete';
        const botAdmin = await isBotAdmin(sock, jid);
        
        try {
            // Delete message first
            await sock.sendMessage(jid, { delete: msg.key });

            switch (action) {
                case 'delete':
                    if (botAdmin) {
                        await sock.sendMessage(jid, { 
                            text: `\`\`\`@${sender.split('@')[0]} links are not allowed here\`\`\``,
                            mentions: [sender] 
                        });
                    }
                    break;

                case 'kick':
                    if (botAdmin) {
                        await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                        await sock.sendMessage(jid, {
                            text: `\`\`\`@${sender.split('@')[0]} has been kicked for sending links\`\`\``,
                            mentions: [sender]
                        });
                    } else {
                        await sock.sendMessage(jid, {
                            text: `⚠️ *Bot needs admin permissions to kick users*\n\n@${sender.split('@')[0]} sent a link but bot is not admin`,
                            mentions: [sender]
                        });
                    }
                    break;

                case 'warn':
                    const warningCount = await incrementWarningCount(jid, sender);
                    if (warningCount >= 3 && botAdmin) {
                        await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                        await resetWarningCount(jid, sender);
                        await sock.sendMessage(jid, {
                            text: `\`\`\`@${sender.split('@')[0]} has been kicked after 3 warnings\`\`\``,
                            mentions: [sender]
                        });
                    } else {
                        await sock.sendMessage(jid, {
                            text: `\`\`\`@${sender.split('@')[0]} warning ${warningCount}/3 for sending links\`\`\``,
                            mentions: [sender]
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Error in Antilink action:', error);
        }
    } catch (error) {
        console.error('Error in Antilink:', error);
    }
}

// Get all antilink settings
function getAllAntilinkSettings() {
    return loadAntilinkSettings();
}

// Check if antilink is enabled for a group
async function isAntilinkEnabled(jid) {
    const settings = await getAntilink(jid);
    return settings?.enabled || false;
}

module.exports = { 
    Antilink, 
    getAntilink, 
    setAntilink, 
    removeAntilink,
    getAllAntilinkSettings,
    isAntilinkEnabled,
    incrementWarningCount,
    resetWarningCount,
    isSudo,
    isBotAdmin,
    containsURL,
    parseGroupIdentifier,
    getGroupJidFromLink
};
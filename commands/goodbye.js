const fs = require('fs-extra');
const path = require('path');

// Goodbye settings storage
const goodbyeSettingsPath = path.join(__dirname, '..', 'data', 'goodbye_settings.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load goodbye settings
function loadGoodbyeSettings() {
    try {
        if (fs.existsSync(goodbyeSettingsPath)) {
            return JSON.parse(fs.readFileSync(goodbyeSettingsPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading goodbye settings:', error);
    }
    return {};
}

// Save goodbye settings
function saveGoodbyeSettings(settings) {
    try {
        fs.writeFileSync(goodbyeSettingsPath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving goodbye settings:', error);
        return false;
    }
}

// Extract invite code from WhatsApp link (without joining)
function extractInviteCode(linkOrJid) {
    // If it's already a JID (ends with @g.us)
    if (linkOrJid && linkOrJid.includes('@g.us')) {
        return { isJid: true, jid: linkOrJid };
    }
    
    // Try to extract invite code from link
    if (linkOrJid && linkOrJid.includes('chat.whatsapp.com/')) {
        let inviteCode = linkOrJid.split('chat.whatsapp.com/').pop();
        // Remove any extra parameters
        inviteCode = inviteCode.split('?')[0].split('/')[0];
        return { isJid: false, inviteCode: inviteCode };
    }
    
    // If it's just the code (alphanumeric)
    if (linkOrJid && /^[A-Za-z0-9]{22}$/.test(linkOrJid)) {
        return { isJid: false, inviteCode: linkOrJid };
    }
    
    return null;
}

// Get group goodbye settings (supports both JID and link)
async function getGroupGoodbyeSettings(conn, groupJidOrLink) {
    const extracted = extractInviteCode(groupJidOrLink);
    if (!extracted) return null;
    
    const settings = loadGoodbyeSettings();
    const key = extracted.isJid ? extracted.jid : `invite:${extracted.inviteCode}`;
    
    return settings[key] || {
        goodbye: false,
        goodbyeMessage: "Goodbye @{member} 👋\n\nWe'll miss you in {group_name}!",
        inviteCode: extracted.isJid ? null : extracted.inviteCode,
        groupJid: extracted.isJid ? extracted.jid : null
    };
}

// Save group goodbye settings (supports both JID and link)
async function saveGroupGoodbyeSettings(conn, groupJidOrLink, groupSettings) {
    const extracted = extractInviteCode(groupJidOrLink);
    if (!extracted) return false;
    
    const settings = loadGoodbyeSettings();
    const key = extracted.isJid ? extracted.jid : `invite:${extracted.inviteCode}`;
    
    if (!extracted.isJid) {
        groupSettings.inviteCode = extracted.inviteCode;
    } else {
        groupSettings.groupJid = extracted.jid;
    }
    
    settings[key] = groupSettings;
    return saveGoodbyeSettings(settings);
}

// Fetch group metadata
async function getGroupMetadata(conn, groupJid) {
    try {
        const metadata = await conn.groupMetadata(groupJid);
        return {
            name: metadata.subject || 'Unknown Group',
            participants: metadata.participants || []
        };
    } catch (error) {
        console.error('Error fetching group metadata:', error);
        return {
            name: 'Unknown Group',
            participants: []
        };
    }
}

// Process message template with variables
function processMessageTemplate(template, variables) {
    let message = template;
    
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'gi');
        message = message.replace(regex, value || '');
    }
    
    const mentionRegex = /@\{([^}]+)\}/g;
    message = message.replace(mentionRegex, (match, userId) => {
        return `@${userId.split('@')[0]}`;
    });
    
    return message;
}

// Send goodbye message with context info
async function sendGoodbyeMessage(conn, groupJid, member, sessionId, userSettings) {
    const settings = await getGroupGoodbyeSettings(conn, groupJid);
    
    if (!settings || !settings.goodbye) return;
    
    try {
        let memberJid = typeof member === 'string' ? member : member.id || member.jid;
        if (!memberJid) {
            console.error('Invalid member object:', member);
            return;
        }
        
        memberJid = String(memberJid);
        
        await conn.sendMessage(groupJid, {
            react: {
                text: '👋',
                key: { remoteJid: groupJid, fromMe: true }
            }
        }).catch(() => {});

        const groupMetadata = await getGroupMetadata(conn, groupJid);
        
        const memberNumber = memberJid.includes('@') ? memberJid.split('@')[0] : memberJid;
        const variables = {
            member: memberNumber,
            group_name: groupMetadata.name,
            total_members: (groupMetadata.participants.length - 1).toString()
        };
        
        const goodbyeMessage = processMessageTemplate(settings.goodbyeMessage, variables);
        const mentions = [memberJid];
        
        const contextInfo = {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363401559573199@newsletter",
                newsletterName: "BrenaldMedia",
                serverMessageId: -1,
            }
        };
        
        await conn.sendMessage(groupJid, {
            text: goodbyeMessage,
            mentions: mentions,
            contextInfo: contextInfo
        }, { quoted: null });
        
    } catch (error) {
        console.error('Error sending goodbye message:', error);
    }
}

// Handle group participants update for goodbye
async function handleGoodbyeParticipantsUpdate(conn, update, sessionId) {
    try {
        const { id, participants, action } = update;
        
        console.log(`🔔 Goodbye participants update: ${action} for group ${id}`);
        
        const settings = await getGroupGoodbyeSettings(conn, id);
        
        if (action === 'remove' || action === 'leave') {
            if (settings && settings.goodbye) {
                const userSettings = global.getUserSettings ? global.getUserSettings(sessionId) : {};
                for (const participant of participants) {
                    console.log(`Sending goodbye to:`, participant);
                    await sendGoodbyeMessage(conn, id, participant, sessionId, userSettings);
                }
            }
        }
    } catch (error) {
        console.error('Error handling goodbye participants update:', error);
    }
}

// DM: Enable/disable goodbye for specific group (supports JID or link without joining)
async function handleDmGoodbyeCommand(conn, sender, args, reply, userSettings, context) {
    const command = args[0]?.toLowerCase();
    
    if (!command) {
        const replyText = `👋 *Goodbye DM Commands:*\n\n` +
                        `*Enable Goodbye:*\n${userSettings.botPrefix || context.PREFIX}goodbye on [group_jid_or_link]\n` +
                        `*Disable Goodbye:*\n${userSettings.botPrefix || context.PREFIX}goodbye off [group_jid_or_link]\n` +
                        `*Set Message:*\n${userSettings.botPrefix || context.PREFIX}setgoodbye [group_jid_or_link] [message]\n\n` +
                        `*Examples:*\n${context.PREFIX}goodbye on 120363420555765995@g.us\n` +
                        `${context.PREFIX}goodbye on https://chat.whatsapp.com/xxxxx\n` +
                        `Variables: @{member}, {group_name}, {total_members}`;
        
        return reply(replyText, {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363401559573199@newsletter",
                    newsletterName: "BrenaldMedia",
                    serverMessageId: -1,
                },
                externalAdReply: {
                    title: "Goodbye System",
                    body: "Manage goodbye messages for groups",
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            }
        });
    }
    
    const groupInput = args[1];
    const value = args.slice(2).join(' ');
    
    if (!groupInput) {
        return reply('❌ Please provide a group JID or invite link', {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363401559573199@newsletter",
                    newsletterName: "BrenaldMedia",
                    serverMessageId: -1,
                }
            }
        });
    }
    
    const extracted = extractInviteCode(groupInput);
    if (!extracted) {
        return reply('❌ Invalid group JID or invite link. Please provide a valid group ID (ending with @g.us) or WhatsApp invite link.', {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363401559573199@newsletter",
                    newsletterName: "BrenaldMedia",
                    serverMessageId: -1,
                }
            }
        });
    }
    
    const displayName = extracted.isJid ? extracted.jid : `Invite: ${extracted.inviteCode}`;
    const settings = await getGroupGoodbyeSettings(conn, groupInput) || {
        goodbye: false,
        goodbyeMessage: "Goodbye @{member} 👋\n\nWe'll miss you in {group_name}!"
    };
    
    switch (command) {
        case 'on':
            settings.goodbye = true;
            await saveGroupGoodbyeSettings(conn, groupInput, settings);
            return reply(`✅ Goodbye messages enabled for: ${displayName}`, {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
            
        case 'off':
            settings.goodbye = false;
            await saveGroupGoodbyeSettings(conn, groupInput, settings);
            return reply(`✅ Goodbye messages disabled for: ${displayName}`, {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
            
        case 'setgoodbye':
            if (!value) {
                return reply('❌ Please provide a goodbye message', {
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363401559573199@newsletter",
                            newsletterName: "BrenaldMedia",
                            serverMessageId: -1,
                        }
                    }
                });
            }
            settings.goodbyeMessage = value;
            settings.goodbye = true;
            await saveGroupGoodbyeSettings(conn, groupInput, settings);
            return reply(`✅ Goodbye message set for: ${displayName}\n\nMessage: ${value}`, {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
            
        default:
            return reply(`❌ Invalid command. Use ${context.PREFIX}goodbye to see available options.`, {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
    }
}

// Command execution
module.exports.execute = async (conn, msg, m, context) => {
    const { args, from, isGroup, isAdmins, isCreator, reply, sender, sessionId, userSettings } = context;
    
    await m.react('👋').catch(() => {});
    
    if (!isGroup) {
        return handleDmGoodbyeCommand(conn, sender, args, reply, userSettings, context);
    }
    
    if (isGroup && !isAdmins && !isCreator) {
        return reply('❌ This command can only be used by group admins or owner.', {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363401559573199@newsletter",
                    newsletterName: "BrenaldMedia",
                    serverMessageId: -1,
                }
            }
        });
    }
    
    const command = args[0]?.toLowerCase();
    
    if (!command) {
        const settings = await getGroupGoodbyeSettings(conn, from);
        
        if (!settings) {
            return reply('❌ Unable to fetch group settings.', {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
        }
        
        let message = `👋 *Goodbye Settings*\n\n`;
        message += `✅ Goodbye Messages: ${settings.goodbye ? 'ON 🟢' : 'OFF 🔴'}\n\n`;
        message += `📋 *Current Goodbye Message:*\n${settings.goodbyeMessage.substring(0, 100)}${settings.goodbyeMessage.length > 100 ? '...' : ''}\n\n`;
        message += `📝 *Commands:*\n`;
        message += `${userSettings.botPrefix || context.PREFIX}goodbye on/off - Toggle goodbye messages\n`;
        message += `${userSettings.botPrefix || context.PREFIX}setgoodbye [message] - Set goodbye message\n`;
        message += `${userSettings.botPrefix || context.PREFIX}goodbyetest - Test goodbye message`;
        
        return reply(message, {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363401559573199@newsletter",
                    newsletterName: "BrenaldMedia",
                    serverMessageId: -1,
                },
                externalAdReply: {
                    title: "Goodbye System",
                    body: "Group goodbye settings",
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            }
        });
    }
    
    const settings = await getGroupGoodbyeSettings(conn, from) || {
        goodbye: false,
        goodbyeMessage: "Goodbye @{member} 👋\n\nWe'll miss you in {group_name}!"
    };
    
    switch (command) {
        case 'on':
        case 'off':
            const status = command === 'on';
            settings.goodbye = status;
            await saveGroupGoodbyeSettings(conn, from, settings);
            await m.react(status ? '✅' : '❌').catch(() => {});
            return reply(`✅ Goodbye messages ${status ? 'enabled 🟢' : 'disabled 🔴'} for this group.`, {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
            
        case 'setgoodbye':
            const goodbyeMessage = args.slice(1).join(' ');
            if (!goodbyeMessage) {
                await m.react('❌').catch(() => {});
                return reply('❌ Please provide a goodbye message.\n\nAvailable variables:\n@{member} - Mention leaving member\n{group_name} - Group name\n{total_members} - Total members count', {
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363401559573199@newsletter",
                            newsletterName: "BrenaldMedia",
                            serverMessageId: -1,
                        }
                    }
                });
            }
            settings.goodbyeMessage = goodbyeMessage;
            await saveGroupGoodbyeSettings(conn, from, settings);
            await m.react('✅').catch(() => {});
            return reply('✅ Goodbye message updated successfully!', {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
            
        case 'goodbyetest':
            await m.react('👋').catch(() => {});
            await sendGoodbyeMessage(conn, from, sender, sessionId, userSettings);
            return reply('✅ Test goodbye message sent!', {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
            
        default:
            await m.react('❓').catch(() => {});
            return reply(`❌ Invalid command. Use ${userSettings.botPrefix || context.PREFIX}goodbye to see available options.`, {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
    }
};

// Export additional functions
module.exports.handleGoodbyeParticipantsUpdate = handleGoodbyeParticipantsUpdate;
module.exports.getGroupGoodbyeSettings = getGroupGoodbyeSettings;
module.exports.saveGroupGoodbyeSettings = saveGroupGoodbyeSettings;
module.exports.loadGoodbyeSettings = loadGoodbyeSettings;
module.exports.saveGoodbyeSettings = saveGoodbyeSettings;
module.exports.sendGoodbyeMessage = sendGoodbyeMessage;
module.exports.extractInviteCode = extractInviteCode;

// Command info
module.exports.info = {
    name: 'goodbye',
    description: 'Manage goodbye messages for groups',
    usage: '[on/off/setgoodbye/goodbyetest]',
    category: 'Group',
    ownerOnly: false,
    adminOnly: true
};
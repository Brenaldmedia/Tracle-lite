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

// Get group goodbye settings
function getGroupGoodbyeSettings(groupJid) {
    const settings = loadGoodbyeSettings();
    return settings[groupJid] || {
        goodbye: false,
        goodbyeMessage: "Goodbye @{member} 👋"
    };
}

// Save group goodbye settings
function saveGroupGoodbyeSettings(groupJid, groupSettings) {
    const settings = loadGoodbyeSettings();
    settings[groupJid] = groupSettings;
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
    
    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'gi');
        message = message.replace(regex, value || '');
    }
    
    // Replace @{mentions} with proper mentions
    const mentionRegex = /@\{([^}]+)\}/g;
    message = message.replace(mentionRegex, (match, userId) => {
        return `@${userId.split('@')[0]}`;
    });
    
    return message;
}
// Send goodbye message with context info
async function sendGoodbyeMessage(conn, groupJid, member, sessionId, userSettings) {
    const settings = getGroupGoodbyeSettings(groupJid);
    
    if (!settings.goodbye) return;
    
    try {
        // Extract JID from participant object
        let memberJid = typeof member === 'string' ? member : member.id || member.jid;
        if (!memberJid) {
            console.error('Invalid member object:', member);
            return;
        }
        
        // Ensure it's a string
        memberJid = String(memberJid);
        
        // React with 👋 emoji
        await conn.sendMessage(groupJid, {
            react: {
                text: '👋',
                key: { remoteJid: groupJid, fromMe: true }
            }
        }).catch(() => {});

        // Get group metadata
        const groupMetadata = await getGroupMetadata(conn, groupJid);
        
        // Prepare variables - safely extract number from JID
        const memberNumber = memberJid.includes('@') ? memberJid.split('@')[0] : memberJid;
        const variables = {
            member: memberNumber,
            group_name: groupMetadata.name,
            total_members: (groupMetadata.participants.length - 1).toString()
        };
        
        // Process message template
        const goodbyeMessage = processMessageTemplate(settings.goodbyeMessage, variables);
        
        // Prepare mentions
        const mentions = [memberJid];
        
        // Context info
        const contextInfo = {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363401559573199@newsletter",
                newsletterName: "BrenaldMedia",
                serverMessageId: -1,
            }
        };
        
        // Send goodbye message with context info
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
        console.log('Participants:', participants);
        
        // Get group settings
        const settings = getGroupGoodbyeSettings(id);
        
        if (action === 'remove' || action === 'leave') {
            // Member(s) removed or left
            if (settings.goodbye) {
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

// DM: Enable/disable goodbye for specific group
async function handleDmGoodbyeCommand(conn, sender, args, reply, userSettings, context) {
    const command = args[0]?.toLowerCase();
    
    if (!command) {
        const replyText = `👋 *Goodbye DM Commands:*\n\n` +
                        `*Enable Goodbye:*\n${userSettings.botPrefix || context.PREFIX}goodbye on [group_jid]\n` +
                        `*Disable Goodbye:*\n${userSettings.botPrefix || context.PREFIX}goodbye off [group_jid]\n` +
                        `*Set Message:*\n${userSettings.botPrefix || context.PREFIX}setgoodbye [group_jid] [message]\n\n` +
                        `*Example:*\n${context.PREFIX}goodbye on 120363420555765995@g.us\n` +
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
    
    const groupJid = args[1];
    const value = args.slice(2).join(' ');
    
    // Validate JID format
    if (!groupJid || !groupJid.includes('@g.us')) {
        return reply('❌ Please provide a valid group JID (must end with @g.us)', {
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
    
    const settings = getGroupGoodbyeSettings(groupJid);
    
    switch (command) {
        case 'on':
            settings.goodbye = true;
            saveGroupGoodbyeSettings(groupJid, settings);
            return reply(`✅ Goodbye messages enabled for group: ${groupJid}`, {
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
            saveGroupGoodbyeSettings(groupJid, settings);
            return reply(`✅ Goodbye messages disabled for group: ${groupJid}`, {
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
            settings.goodbye = true; // Auto-enable when setting message
            saveGroupGoodbyeSettings(groupJid, settings);
            return reply(`✅ Goodbye message set for group: ${groupJid}\n\nMessage: ${value}`, {
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
    const { args, from, isGroup, isAdmins, isCreator, reply, sender, groupMetadata, sessionId, userSettings } = context;
    
    // React with 👋 emoji to command
    await m.react('👋').catch(() => {});
    
    // DM mode command handling
    if (!isGroup) {
        return handleDmGoodbyeCommand(conn, sender, args, reply, userSettings, context);
    }
    
    // Group command handling
    // Check if user is admin/owner
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
        // Show current settings
        const settings = getGroupGoodbyeSettings(from);
        
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
    
    // Handle subcommands
    const settings = getGroupGoodbyeSettings(from);
    
    switch (command) {
        case 'on':
        case 'off':
            // Toggle goodbye messages
            const status = command === 'on';
            settings.goodbye = status;
            saveGroupGoodbyeSettings(from, settings);
            
            // React based on status
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
            saveGroupGoodbyeSettings(from, settings);
            
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
            // Test goodbye message
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

// Export additional functions for use in main bot file
module.exports.handleGoodbyeParticipantsUpdate = handleGoodbyeParticipantsUpdate;
module.exports.getGroupGoodbyeSettings = getGroupGoodbyeSettings;
module.exports.saveGroupGoodbyeSettings = saveGroupGoodbyeSettings;
module.exports.loadGoodbyeSettings = loadGoodbyeSettings;
module.exports.saveGoodbyeSettings = saveGoodbyeSettings;
module.exports.sendGoodbyeMessage = sendGoodbyeMessage;

// Command info
module.exports.info = {
    name: 'goodbye',
    description: 'Manage goodbye messages for groups',
    usage: '[on/off/setgoodbye/goodbyetest]',
    category: 'Group',
    ownerOnly: false,
    adminOnly: true
};
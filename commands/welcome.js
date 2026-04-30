const fs = require('fs-extra');
const path = require('path');

// Welcome settings storage
const welcomeSettingsPath = path.join(__dirname, '..', 'data', 'welcome_settings.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load welcome settings
function loadWelcomeSettings() {
    try {
        if (fs.existsSync(welcomeSettingsPath)) {
            return JSON.parse(fs.readFileSync(welcomeSettingsPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading welcome settings:', error);
    }
    return {};
}

// Save welcome settings
function saveWelcomeSettings(settings) {
    try {
        fs.writeFileSync(welcomeSettingsPath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving welcome settings:', error);
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

// Get group welcome settings (supports both JID and link)
async function getGroupWelcomeSettings(conn, groupJidOrLink) {
    const extracted = extractInviteCode(groupJidOrLink);
    if (!extracted) return null;
    
    const settings = loadWelcomeSettings();
    const key = extracted.isJid ? extracted.jid : `invite:${extracted.inviteCode}`;
    
    return settings[key] || {
        welcome: false,
        welcomeMessage: "Hello @{new_member} welcome to {group_name}\n\nPlease read the message below:\n{group_description}",
        includeDescription: true,
        fetchProfilePic: true,
        inviteCode: extracted.isJid ? null : extracted.inviteCode,
        groupJid: extracted.isJid ? extracted.jid : null
    };
}

// Save group welcome settings (supports both JID and link)
async function saveGroupWelcomeSettings(conn, groupJidOrLink, groupSettings) {
    const extracted = extractInviteCode(groupJidOrLink);
    if (!extracted) return false;
    
    const settings = loadWelcomeSettings();
    const key = extracted.isJid ? extracted.jid : `invite:${extracted.inviteCode}`;
    
    if (!extracted.isJid) {
        groupSettings.inviteCode = extracted.inviteCode;
    } else {
        groupSettings.groupJid = extracted.jid;
    }
    
    settings[key] = groupSettings;
    return saveWelcomeSettings(settings);
}

// Fetch group metadata including description
async function getGroupMetadata(conn, groupJid) {
    try {
        const metadata = await conn.groupMetadata(groupJid);
        return {
            name: metadata.subject || 'Unknown Group',
            description: metadata.desc || 'No description set',
            participants: metadata.participants || [],
            admins: metadata.participants.filter(p => p.admin).map(p => p.id) || [],
            owner: metadata.owner || null
        };
    } catch (error) {
        console.error('Error fetching group metadata:', error);
        return {
            name: 'Unknown Group',
            description: 'No description available',
            participants: [],
            admins: [],
            owner: null
        };
    }
}

// Fetch user profile picture
async function getUserProfilePicture(conn, userJid) {
    try {
        const profilePicture = await conn.profilePictureUrl(userJid, 'image');
        return profilePicture;
    } catch (error) {
        console.error('Error fetching profile picture:', error);
        return null;
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

// Send welcome message with context info
async function sendWelcomeMessage(conn, groupJid, newMember, sessionId, userSettings) {
    const settings = await getGroupWelcomeSettings(conn, groupJid);
    
    if (!settings || !settings.welcome) return;
    
    try {
        // Extract JID from participant object
        let newMemberJid = typeof newMember === 'string' ? newMember : newMember.id || newMember.jid;
        if (!newMemberJid) {
            console.error('Invalid new member object:', newMember);
            return;
        }
        
        // Ensure it's a string
        newMemberJid = String(newMemberJid);
        
        // React with 👋 emoji
        await conn.sendMessage(groupJid, {
            react: {
                text: '👋',
                key: { remoteJid: groupJid, fromMe: true }
            }
        }).catch(() => {});

        // Get group metadata
        const groupMetadata = await getGroupMetadata(conn, groupJid);
        
        // Get user profile picture if enabled
        let profilePicture = null;
        if (settings.fetchProfilePic) {
            profilePicture = await getUserProfilePicture(conn, newMemberJid);
        }
        
        // Prepare variables - safely extract number from JID
        const memberNumber = newMemberJid.includes('@') ? newMemberJid.split('@')[0] : newMemberJid;
        const variables = {
            new_member: memberNumber,
            group_name: groupMetadata.name,
            group_description: settings.includeDescription ? groupMetadata.description : '',
            total_members: groupMetadata.participants.length.toString(),
            admin_count: groupMetadata.admins.length.toString()
        };
        
        // Process message template
        const welcomeMessage = processMessageTemplate(settings.welcomeMessage, variables);
        
        // Prepare mentions
        const mentions = [newMemberJid];
        
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
        
        // Add profile picture if available
        if (profilePicture) {
            try {
                await conn.sendMessage(groupJid, {
                    image: { url: profilePicture },
                    caption: welcomeMessage,
                    mentions: mentions,
                    contextInfo: contextInfo
                }, { quoted: null });
                return;
            } catch (error) {
                console.error('Error sending image welcome message:', error);
                // Fall back to text message
            }
        }
        
        // Send text message with context info
        await conn.sendMessage(groupJid, {
            text: welcomeMessage,
            mentions: mentions,
            contextInfo: contextInfo
        }, { quoted: null });
        
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
}

// Handle group participants update for welcome
async function handleWelcomeParticipantsUpdate(conn, update, sessionId) {
    try {
        const { id, participants, action } = update;
        
        console.log(`🔔 Welcome participants update: ${action} for group ${id}`);
        console.log('Participants:', participants);
        
        // Get group settings
        const settings = await getGroupWelcomeSettings(conn, id);
        
        if (action === 'add') {
            // New member(s) added
            if (settings && settings.welcome) {
                const userSettings = global.getUserSettings ? global.getUserSettings(sessionId) : {};
                for (const participant of participants) {
                    console.log(`Sending welcome to:`, participant);
                    await sendWelcomeMessage(conn, id, participant, sessionId, userSettings);
                }
            }
        }
    } catch (error) {
        console.error('Error handling welcome participants update:', error);
    }
}

// DM: Enable/disable welcome for specific group (supports JID or link without joining)
async function handleDmWelcomeCommand(conn, sender, args, reply, userSettings, context) {
    const command = args[0]?.toLowerCase();
    
    if (!command) {
        const replyText = `📝 *Welcome DM Commands:*\n\n` +
                        `*Enable Welcome:*\n${userSettings.botPrefix || context.PREFIX}welcome on [group_jid_or_link]\n` +
                        `*Disable Welcome:*\n${userSettings.botPrefix || context.PREFIX}welcome off [group_jid_or_link]\n` +
                        `*Set Message:*\n${userSettings.botPrefix || context.PREFIX}setwelcome [group_jid_or_link] [message]\n\n` +
                        `*Examples:*\n${context.PREFIX}welcome on 120363420555765995@g.us\n` +
                        `${context.PREFIX}welcome on https://chat.whatsapp.com/xxxxx\n` +
                        `Variables: @{new_member}, {group_name}, {group_description}, {total_members}, {admin_count}`;
        
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
                    title: "Welcome System",
                    body: "Manage welcome messages for groups",
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            }
        });
    }
    
    const groupInput = args[1];
    const value = args.slice(2).join(' ');
    
    // Validate input
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
    
    // Extract info without joining
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
    const settings = await getGroupWelcomeSettings(conn, groupInput) || {
        welcome: false,
        welcomeMessage: "Hello @{new_member} welcome to {group_name}\n\nPlease read the message below:\n{group_description}",
        includeDescription: true,
        fetchProfilePic: true
    };
    
    switch (command) {
        case 'on':
            settings.welcome = true;
            await saveGroupWelcomeSettings(conn, groupInput, settings);
            return reply(`✅ Welcome messages enabled for: ${displayName}`, {
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
            settings.welcome = false;
            await saveGroupWelcomeSettings(conn, groupInput, settings);
            return reply(`✅ Welcome messages disabled for: ${displayName}`, {
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
            
        case 'setwelcome':
            if (!value) {
                return reply('❌ Please provide a welcome message', {
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
            settings.welcomeMessage = value;
            settings.welcome = true; // Auto-enable when setting message
            await saveGroupWelcomeSettings(conn, groupInput, settings);
            return reply(`✅ Welcome message set for: ${displayName}\n\nMessage: ${value}`, {
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
            return reply(`❌ Invalid command. Use ${context.PREFIX}welcome to see available options.`, {
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
        return handleDmWelcomeCommand(conn, sender, args, reply, userSettings, context);
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
        const settings = await getGroupWelcomeSettings(conn, from);
        
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
        
        let message = `👋 *Welcome Settings*\n\n`;
        message += `✅ Welcome Messages: ${settings.welcome ? 'ON 🟢' : 'OFF 🔴'}\n`;
        message += `📝 Include Description: ${settings.includeDescription ? 'YES' : 'NO'}\n`;
        message += `🖼️ Fetch Profile Pic: ${settings.fetchProfilePic ? 'YES' : 'NO'}\n\n`;
        
        message += `📋 *Current Welcome Message:*\n${settings.welcomeMessage.substring(0, 100)}${settings.welcomeMessage.length > 100 ? '...' : ''}\n\n`;
        
        message += `📝 *Commands:*\n`;
        message += `${userSettings.botPrefix || context.PREFIX}welcome on/off - Toggle welcome messages\n`;
        message += `${userSettings.botPrefix || context.PREFIX}setwelcome [message] - Set welcome message\n`;
        message += `${userSettings.botPrefix || context.PREFIX}welcometest - Test welcome message\n`;
        message += `${userSettings.botPrefix || context.PREFIX}togglepic - Toggle profile picture\n`;
        message += `${userSettings.botPrefix || context.PREFIX}toggledesc - Toggle description inclusion`;
        
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
                    title: "Welcome System",
                    body: "Group welcome settings",
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            }
        });
    }
    
    // Handle subcommands
    const settings = await getGroupWelcomeSettings(conn, from) || {
        welcome: false,
        welcomeMessage: "Hello @{new_member} welcome to {group_name}\n\nPlease read the message below:\n{group_description}",
        includeDescription: true,
        fetchProfilePic: true
    };
    
    switch (command) {
        case 'on':
        case 'off':
            const status = command === 'on';
            settings.welcome = status;
            await saveGroupWelcomeSettings(conn, from, settings);
            await m.react(status ? '✅' : '❌').catch(() => {});
            return reply(`✅ Welcome messages ${status ? 'enabled 🟢' : 'disabled 🔴'} for this group.`, {
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
            
        case 'setwelcome':
            const welcomeMessage = args.slice(1).join(' ');
            if (!welcomeMessage) {
                await m.react('❌').catch(() => {});
                return reply('❌ Please provide a welcome message.\n\nAvailable variables:\n@{new_member} - Mention new member\n{group_name} - Group name\n{group_description} - Group description\n{total_members} - Total members count\n{admin_count} - Admin count', {
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
            settings.welcomeMessage = welcomeMessage;
            await saveGroupWelcomeSettings(conn, from, settings);
            await m.react('✅').catch(() => {});
            return reply('✅ Welcome message updated successfully!', {
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
            
        case 'welcometest':
            await m.react('👋').catch(() => {});
            await sendWelcomeMessage(conn, from, sender, sessionId, userSettings);
            return reply('✅ Test welcome message sent!', {
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
            
        case 'togglepic':
            settings.fetchProfilePic = !settings.fetchProfilePic;
            await saveGroupWelcomeSettings(conn, from, settings);
            await m.react(settings.fetchProfilePic ? '🖼️' : '📝').catch(() => {});
            return reply(`✅ Profile picture ${settings.fetchProfilePic ? 'enabled 🖼️' : 'disabled 📝'} for welcome messages.`, {
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
            
        case 'toggledesc':
            settings.includeDescription = !settings.includeDescription;
            await saveGroupWelcomeSettings(conn, from, settings);
            await m.react(settings.includeDescription ? '📋' : '📝').catch(() => {});
            return reply(`✅ Group description ${settings.includeDescription ? 'included 📋' : 'excluded 📝'} in welcome messages.`, {
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
            return reply(`❌ Invalid command. Use ${userSettings.botPrefix || context.PREFIX}welcome to see available options.`, {
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
module.exports.handleWelcomeParticipantsUpdate = handleWelcomeParticipantsUpdate;
module.exports.getGroupWelcomeSettings = getGroupWelcomeSettings;
module.exports.saveGroupWelcomeSettings = saveGroupWelcomeSettings;
module.exports.loadWelcomeSettings = loadWelcomeSettings;
module.exports.saveWelcomeSettings = saveWelcomeSettings;
module.exports.sendWelcomeMessage = sendWelcomeMessage;
module.exports.extractInviteCode = extractInviteCode;

// Command info
module.exports.info = {
    name: 'welcome',
    description: 'Manage welcome messages for groups',
    usage: '[on/off/setwelcome/welcometest/togglepic/toggledesc]',
    category: 'Group',
    ownerOnly: false,
    adminOnly: true
};
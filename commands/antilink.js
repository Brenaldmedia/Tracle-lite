const { 
    getAntilink, 
    setAntilink, 
    removeAntilink,
    getAllAntilinkSettings,
    isAntilinkEnabled,
    parseGroupIdentifier,
    getGroupJidFromLink
} = require('../lib/antilink');

module.exports = {
    name: 'antilink',
    pattern: ['antilink'],
    description: 'Manage antilink settings for groups (can be used in DM or group)',
    usage: 'In group: .antilink <on/off/set> <delete/kick/warn>\nIn DM: .antilink <delete/kick/warn> <group_jid_or_link>',
    category: 'moderation',
    ownerOnly: false,
    groupOnly: false, // Can be used in DM too
    adminOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { from, sender, isGroup, groupMetadata, args, reply, userPrefix, userSettings, isAdmins, sendMessageWithContext, sessionId } = context;
            
            const action = args[0]?.toLowerCase();
            
            if (!action) {
                const usage = `\`\`\`🔗 *ANTILINK SYSTEM*\`\`\`

📌 *Usage in Group:*
• \`${userPrefix}antilink on\` - Enable antilink
• \`${userPrefix}antilink set delete|kick|warn\` - Set action
• \`${userPrefix}antilink off\` - Disable antilink
• \`${userPrefix}antilink get\` - Check current settings

📌 *Usage in DM:*
• \`${userPrefix}antilink delete <group_jid_or_link>\`
• \`${userPrefix}antilink kick <group_jid_or_link>\`
• \`${userPrefix}antilink warn <group_jid_or_link>\`
• \`${userPrefix}antilink off <group_jid_or_link>\`
• \`${userPrefix}antilink get <group_jid_or_link>\`

⚡ *Available Actions:*
• \`delete\` - Delete link messages
• \`kick\` - Kick users sending links
• \`warn\` - Warn users (3 warnings = kick)

🛡️ *Admin Note:* Links sent by admins are always allowed.`;
                
                return await sendMessageWithContext(conn, from, usage, {
                    quoted: message,
                    externalAdReply: {
                        title: `${userSettings.botName || context.BOT_NAME} Antilink`,
                        body: "Configure link protection for your groups",
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            }

            // Handle DM commands
            if (!isGroup) {
                if (args.length < 2) {
                    return await sendMessageWithContext(conn, from,
                        `❌ *Missing Group Identifier*\n\nUsage in DM:\n• ${userPrefix}antilink <delete/kick/warn/off/get> <group_jid_or_link>\n\nExamples:\n• ${userPrefix}antilink delete 120363420555765995@g.us\n• ${userPrefix}antilink kick https://chat.whatsapp.com/HZnha8aKKQRDBOAtK5qUeC`, {
                        quoted: message
                    });
                }

                const dmAction = action;
                const groupIdentifier = args.slice(1).join(' ');
                
                // Parse group jid
                let groupJid = groupIdentifier;
                if (groupIdentifier.includes('chat.whatsapp.com')) {
                    groupJid = await getGroupJidFromLink(conn, groupIdentifier);
                    if (!groupJid) {
                        return await sendMessageWithContext(conn, from,
                            `❌ *Invalid Group Link*\n\nCould not extract group JID from the link.\nPlease provide a valid WhatsApp group link or JID.`, {
                            quoted: message
                        });
                    }
                } else if (!groupIdentifier.includes('@g.us')) {
                    groupJid = `${groupIdentifier}@g.us`;
                }

                // Check if user is admin in the target group
                let userIsAdmin = false;
                try {
                    const groupMetadata = await conn.groupMetadata(groupJid);
                    const participant = groupMetadata.participants.find(p => p.id === sender);
                    userIsAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
                } catch (error) {
                    console.error('Error checking admin status:', error);
                }

                if (!userIsAdmin) {
                    return await sendMessageWithContext(conn, from,
                        `❌ *Permission Denied*\n\nYou must be an admin in the group "${groupJid}" to configure antilink settings.`, {
                        quoted: message
                    });
                }

                // Check if bot is admin in the group
                let botIsAdmin = false;
                try {
                    const groupMetadata = await conn.groupMetadata(groupJid);
                    const botId = conn.user?.id;
                    const participant = groupMetadata.participants.find(p => p.id === botId);
                    botIsAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
                } catch (error) {
                    console.error('Error checking bot admin status:', error);
                }

                switch (dmAction) {
                    case 'delete':
                    case 'kick':
                    case 'warn':
                        if (!botIsAdmin && (dmAction === 'delete' || dmAction === 'kick')) {
                            await setAntilink(groupJid, dmAction);
                            return await sendMessageWithContext(conn, from,
                                `⚠️ *Antilink Enabled with Limitations*\n\n✅ Antilink set to "${dmAction}" for group:\n${groupJid}\n\n❌ *Warning:* Bot is not admin in this group!\nThe "${dmAction}" action requires bot admin permissions.\n\nPlease make the bot admin for full functionality.`, {
                                quoted: message
                            });
                        }
                        
                        await setAntilink(groupJid, dmAction);
                        return await sendMessageWithContext(conn, from,
                            `✅ *Antilink Configured Successfully*\n\nGroup: ${groupJid}\nAction: ${dmAction.toUpperCase()}\nBot Admin: ${botIsAdmin ? '✅ Yes' : '❌ No'}\n\n${dmAction === 'delete' ? '🔨 Links will be deleted' : ''}\
                            ${dmAction === 'kick' ? '👢 Users will be kicked immediately' : ''}\
                            ${dmAction === 'warn' ? '⚠️ Users will be warned (3 warnings = kick)' : ''}`, {
                            quoted: message
                        });

                    case 'off':
                        await removeAntilink(groupJid);
                        return await sendMessageWithContext(conn, from,
                            `✅ *Antilink Disabled*\n\nAntilink protection has been turned off for group:\n${groupJid}\n\n⚠️ Links are now allowed in this group.`, {
                            quoted: message
                        });

                    case 'get':
                        const config = await getAntilink(groupJid);
                        if (!config) {
                            return await sendMessageWithContext(conn, from,
                                `❌ *No Configuration*\n\nAntilink is not configured for group:\n${groupJid}\n\nUse: ${userPrefix}antilink <delete/kick/warn> ${groupJid}`, {
                                quoted: message
                            });
                        }
                        
                        return await sendMessageWithContext(conn, from,
                            `🔗 *Antilink Status*\n\nGroup: ${groupJid}\nStatus: ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}\nAction: ${config.action.toUpperCase()}\nBot Admin: ${botIsAdmin ? '✅ Yes' : '❌ No'}\n\n${config.enabled ? '🛡️ Protection is active' : '⚠️ Protection is disabled'}`, {
                            quoted: message
                        });

                    default:
                        return await sendMessageWithContext(conn, from,
                            `❌ *Invalid Action*\n\nValid actions: delete, kick, warn, off, get\n\nExample: ${userPrefix}antilink delete 120363420555765995@g.us`, {
                            quoted: message
                        });
                }
            }

            // Handle group commands (existing functionality)
            if (!isAdmins) {
                return await sendMessageWithContext(conn, from, 
                    `❌ *Permission Denied!*\n\nOnly group admins can configure antilink settings.`, {
                    quoted: message
                });
            }

            switch (action) {
                case 'on':
                    const existingConfig = await getAntilink(from);
                    if (existingConfig?.enabled) {
                        return await sendMessageWithContext(conn, from,
                            `✅ *Antilink Status*\n\nAntilink is already enabled in this group\n\nAction: ${existingConfig.action.toUpperCase()}`, {
                            quoted: message
                        });
                    }
                    await setAntilink(from, 'delete');
                    return await sendMessageWithContext(conn, from,
                        `🔗 *ANTILINK ENABLED SUCCESSFULLY*\n\n✅ Link protection is now active\n⚡ Default action: Delete messages\n\nUse \`${userPrefix}antilink set <action>\` to change action`, {
                        quoted: message
                    });

                case 'off':
                    await removeAntilink(from);
                    return await sendMessageWithContext(conn, from,
                        `🔓 *ANTILINK DISABLED*\n\n✅ Link protection has been turned off\n⚠️ Links are now allowed in this group\n\nUse \`${userPrefix}antilink on\` to enable again`, {
                        quoted: message
                    });

                case 'set':
                    if (args.length < 2) {
                        return await sendMessageWithContext(conn, from,
                            `❌ *Missing Action*\n\nPlease specify an action: delete, kick, or warn\n\nExample: \`${userPrefix}antilink set kick\``, {
                            quoted: message
                        });
                    }
                    
                    const setAction = args[1].toLowerCase();
                    if (!['delete', 'kick', 'warn'].includes(setAction)) {
                        return await sendMessageWithContext(conn, from,
                            `❌ *Invalid Action*\n\nPlease choose from: delete, kick, warn\n\nExample: \`${userPrefix}antilink set kick\``, {
                            quoted: message
                        });
                    }
                    
                    await setAntilink(from, setAction);
                    return await sendMessageWithContext(conn, from,
                        `⚡ *ANTILINK ACTION UPDATED*\n\n✅ Action successfully changed to: ${setAction.toUpperCase()}\n\n${setAction === 'delete' ? '🔨 Links will be deleted' : ''}\
                        ${setAction === 'kick' ? '👢 Users will be kicked immediately' : ''}\
                        ${setAction === 'warn' ? '⚠️ Users will be warned (3 warnings = kick)' : ''}`, {
                        quoted: message
                    });

                case 'get':
                    const config = await getAntilink(from);
                    if (!config) {
                        return await sendMessageWithContext(conn, from,
                            `❌ *NO ANTILINK CONFIGURATION*\n\nAntilink is not configured for this group\n\nUse \`${userPrefix}antilink on\` to enable it`, {
                            quoted: message
                        });
                    }
                    
                    return await sendMessageWithContext(conn, from,
                        `🔗 *ANTILINK STATUS REPORT*\n\n📋 Status: ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n⚡ Action: ${config.action.toUpperCase()}\n\n👑 *Note:* Admin links are always allowed`, {
                        quoted: message
                    });

                default:
                    return await sendMessageWithContext(conn, from,
                        `❌ *Invalid Option*\n\nPlease use one of these options:\n\`${userPrefix}antilink on\` - Enable\n\`${userPrefix}antilink set <action>\` - Set action\n\`${userPrefix}antilink off\` - Disable\n\`${userPrefix}antilink get\` - Check status`, {
                        quoted: message
                        });
            }
        } catch (error) {
            console.error('Error in antilink command:', error);
            return await sendMessageWithContext(conn, message.key.remoteJid, 
                `❌ *Command Error*\n\nAn error occurred while processing the antilink command\n\nError: ${error.message}`, {
                quoted: message
            });
        }
    }
};
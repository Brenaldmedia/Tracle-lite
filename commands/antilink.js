const { 
    getAntilink, 
    setAntilink, 
    removeAntilink 
} = require('../lib/index');

module.exports = {
    name: 'antilink',
    pattern: ['antilink'],
    description: 'Manage antilink settings for groups',
    usage: '.antilink <on/off/set/get> <delete/kick/warn>',
    category: 'group',
    ownerOnly: false,
    groupOnly: true,
    adminOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { from, sender, isGroup, groupMetadata, args, reply, userPrefix, userSettings, isAdmins, sendMessageWithContext } = context;
            
            // Check if it's a group
            if (!isGroup) {
                return await sendMessageWithContext(conn, from, 
                    '❌ This command can only be used in groups!', {
                    quoted: message,
                    externalAdReply: {
                        title: "Group Only Command",
                        body: "Antilink settings can only be configured in groups",
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            }

            // Check if sender is admin
            if (!isAdmins) {
                return await sendMessageWithContext(conn, from, 
                    `❌ *Permission Denied!*\n\nOnly group admins can configure antilink settings.`, {
                    quoted: message,
                    externalAdReply: {
                        title: "Admin Only Command",
                        body: "This command requires admin privileges",
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            }

            const action = args[0]?.toLowerCase();
            
            if (!action) {
                const usage = `\`\`\`🔗 *ANTILINK SYSTEM - ADMIN PANEL*\`\`\`

📌 *Available Commands:*
• \`${userPrefix}antilink on\` - Enable antilink
• \`${userPrefix}antilink set delete|kick|warn\` - Set action
• \`${userPrefix}antilink off\` - Disable antilink
• \`${userPrefix}antilink get\` - Check current settings

⚡ *Available Actions:*
• \`delete\` - Delete link messages
• \`kick\` - Kick users sending links
• \`warn\` - Warn users (3 warnings = kick)

🛡️ *Admin Note:* Links sent by admins are always allowed.`;
                
                return await sendMessageWithContext(conn, from, usage, {
                    quoted: message,
                    externalAdReply: {
                        title: `${userSettings.botName || context.BOT_NAME} Antilink`,
                        body: "Configure link protection for your group",
                        thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                });
            }

            switch (action) {
                case 'on':
                    const existingConfig = await getAntilink(from);
                    if (existingConfig?.enabled) {
                        return await sendMessageWithContext(conn, from,
                            `✅ *Antilink Status*\n\nAntilink is already enabled in this group\n\nAction: ${existingConfig.action.toUpperCase()}\nType: ${existingConfig.type}`, {
                            quoted: message,
                            externalAdReply: {
                                title: "Already Enabled",
                                body: "Antilink is already active",
                                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                                sourceUrl: context.REPO_LINK,
                                mediaType: 1
                            }
                        });
                    }
                    await setAntilink(from, 'on', 'delete');
                    return await sendMessageWithContext(conn, from,
                        `🔗 *ANTILINK ENABLED SUCCESSFULLY*\n\n✅ Link protection is now active\n⚡ Default action: Delete messages\n\nUse \`${userPrefix}antilink set <action>\` to change action`, {
                        quoted: message,
                        externalAdReply: {
                            title: "Antilink Enabled",
                            body: "Link protection is now active",
                            thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                            sourceUrl: context.REPO_LINK,
                            mediaType: 1
                        }
                    });

                case 'off':
                    await removeAntilink(from);
                    return await sendMessageWithContext(conn, from,
                        `🔓 *ANTILINK DISABLED*\n\n✅ Link protection has been turned off\n⚠️ Links are now allowed in this group\n\nUse \`${userPrefix}antilink on\` to enable again`, {
                        quoted: message,
                        externalAdReply: {
                            title: "Antilink Disabled",
                            body: "Links are now allowed",
                            thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                            sourceUrl: context.REPO_LINK,
                            mediaType: 1
                        }
                    });

                case 'set':
                    if (args.length < 2) {
                        return await sendMessageWithContext(conn, from,
                            `❌ *Missing Action*\n\nPlease specify an action: delete, kick, or warn\n\nExample: \`${userPrefix}antilink set kick\``, {
                            quoted: message,
                            externalAdReply: {
                                title: "Missing Action",
                                body: "Specify delete/kick/warn",
                                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                                sourceUrl: context.REPO_LINK,
                                mediaType: 1
                            }
                        });
                    }
                    
                    const setAction = args[1].toLowerCase();
                    if (!['delete', 'kick', 'warn'].includes(setAction)) {
                        return await sendMessageWithContext(conn, from,
                            `❌ *Invalid Action*\n\nPlease choose from: delete, kick, warn\n\nExample: \`${userPrefix}antilink set kick\``, {
                            quoted: message,
                            externalAdReply: {
                                title: "Invalid Action",
                                body: "Choose delete/kick/warn",
                                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                                sourceUrl: context.REPO_LINK,
                                mediaType: 1
                            }
                        });
                    }
                    
                    await setAntilink(from, 'on', setAction);
                    return await sendMessageWithContext(conn, from,
                        `⚡ *ANTILINK ACTION UPDATED*\n\n✅ Action successfully changed to: ${setAction.toUpperCase()}\n\n${setAction === 'delete' ? '🔨 Links will be deleted' : ''}\
                        ${setAction === 'kick' ? '👢 Users will be kicked immediately' : ''}\
                        ${setAction === 'warn' ? '⚠️ Users will be warned (3 warnings = kick)' : ''}`, {
                        quoted: message,
                        externalAdReply: {
                            title: "Action Updated",
                            body: `Action set to: ${setAction}`,
                            thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                            sourceUrl: context.REPO_LINK,
                            mediaType: 1
                        }
                    });

                case 'get':
                    const config = await getAntilink(from);
                    if (!config) {
                        return await sendMessageWithContext(conn, from,
                            `❌ *NO ANTILINK CONFIGURATION*\n\nAntilink is not configured for this group\n\nUse \`${userPrefix}antilink on\` to enable it`, {
                            quoted: message,
                            externalAdReply: {
                                title: "Not Configured",
                                body: "Antilink is not enabled",
                                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                                sourceUrl: context.REPO_LINK,
                                mediaType: 1
                            }
                        });
                    }
                    
                    const status = config.enabled ? '✅ ENABLED' : '❌ DISABLED';
                    const actionEmoji = {
                        'delete': '🔨',
                        'kick': '👢', 
                        'warn': '⚠️'
                    }[config.action] || '⚙️';
                    
                    return await sendMessageWithContext(conn, from,
                        `🔗 *ANTILINK STATUS REPORT*\n\n📋 Status: ${status}\n${actionEmoji} Action: ${config.action.toUpperCase()}\n📊 Type: ${config.type}\n\n👑 *Note:* Admin links are always allowed`, {
                        quoted: message,
                        externalAdReply: {
                            title: "Antilink Status",
                            body: `Status: ${config.enabled ? 'Active' : 'Inactive'}`,
                            thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                            sourceUrl: context.REPO_LINK,
                            mediaType: 1
                        }
                    });

                default:
                    return await sendMessageWithContext(conn, from,
                        `❌ *Invalid Option*\n\nPlease use one of these options:\n\`${userPrefix}antilink on\` - Enable\n\`${userPrefix}antilink set <action>\` - Set action\n\`${userPrefix}antilink off\` - Disable\n\`${userPrefix}antilink get\` - Check status`, {
                        quoted: message,
                        externalAdReply: {
                            title: "Invalid Option",
                            body: "Use on/off/set/get",
                            thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                            sourceUrl: context.REPO_LINK,
                            mediaType: 1
                        }
                    });
            }
        } catch (error) {
            console.error('Error in antilink command:', error);
            return await sendMessageWithContext(conn, message.key.remoteJid, 
                `❌ *Command Error*\n\nAn error occurred while processing the antilink command\n\nError: ${error.message}`, {
                quoted: message,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: 200,
                    }
                }
            });
        }
    }
};
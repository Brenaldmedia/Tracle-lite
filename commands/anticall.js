// commands/anticall.js
const fs = require('fs');
const path = require('path');

// Channel info for your style (using BRENALDMEDIA newsletter)
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363401559573199@newsletter',
            newsletterName: 'BrenaldMedia',
            serverMessageId: -1
        }
    }
};

// Path to store anti-call configuration
const configPath = path.join(__dirname, '../data/anticall.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize config file if it doesn't exist
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
}

async function anticallCommand(conn, message, m, context) {
    try {
        const { args, from, reply, sessionId, isBotOwner } = context;
        
        // Check if sender is owner (use your existing isBotOwner function)
        const isOwner = isBotOwner();
        
        if (!isOwner) {
            return await reply('❌ 𝐓𝐡𝐢𝐬 𝐂𝐨𝐦𝐦𝐚𝐧𝐝 𝐂𝐚𝐧 𝐁𝐞 𝐔𝐬𝐞𝐝 𝐎𝐧𝐥𝐲 𝐁𝐲 𝐌𝐲 𝐎𝐰𝐧𝐞𝐫 𝐎𝐧𝐥𝐲!', {
                externalAdReply: {
                    title: "Permission Denied",
                    body: "Owner only command",
                    thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }

        // Read current config
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // If no arguments, show usage
        if (!args || args.length === 0) {
            const status = config.enabled ? '✅ enabled' : '❌ disabled';
            return await reply(
                `📵 *𝐀𝐍𝐓𝐈-𝐂𝐀𝐋𝐋 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒*\n\n` +
                `Current status: ${status}\n\n` +
                `*Usage:*\n` +
                `- ${context.userPrefix || context.PREFIX}anticall on  : Enable Anti-Call\n` +
                `- ${context.userPrefix || context.PREFIX}anticall off : Disable Anti-Call\n\n` +
                `*Example:* ${context.userPrefix || context.PREFIX}anticall on`,
                {
                    externalAdReply: {
                        title: "Anti-Call Settings",
                        body: `Status: ${config.enabled ? 'Enabled' : 'Disabled'}`,
                        thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                }
            );
        }

        // Handle on/off commands
        const command = args[0].toLowerCase();
        if (command === 'on') {
            config.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            
            // Update all active connections to have the anticall config
            const activeConnections = context.activeConnections;
            for (const [sessionId, connection] of activeConnections.entries()) {
                if (connection.settings) {
                    connection.settings.anticallEnabled = true;
                }
            }
            
            return await reply('✅ *ANTICALL IS ENABLED*\n\nBot will now automatically reject incoming calls.', {
                externalAdReply: {
                    title: "Anti-Call Enabled",
                    body: "Bot will reject incoming calls",
                    thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
            
        } else if (command === 'off') {
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            
            // Update all active connections
            const activeConnections = context.activeConnections;
            for (const [sessionId, connection] of activeConnections.entries()) {
                if (connection.settings) {
                    connection.settings.anticallEnabled = false;
                }
            }
            
            return await reply('❌ *ANTICALL IS DISABLED*\n\nBot will no longer automatically reject calls.', {
                externalAdReply: {
                    title: "Anti-Call Disabled",
                    body: "Bot will accept incoming calls",
                    thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
            
        } else {
            return await reply(
                `❌ Invalid option!\n\n` +
                `*Usage:*\n` +
                `- ${context.userPrefix || context.PREFIX}anticall on  : Enable Anti-Call\n` +
                `- ${context.userPrefix || context.PREFIX}anticall off : Disable Anti-Call\n\n` +
                `*Example:* ${context.userPrefix || context.PREFIX}anticall on`,
                {
                    externalAdReply: {
                        title: "Invalid Option",
                        body: "Use 'on' or 'off'",
                        thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                }
            );
        }

    } catch (error) {
        console.error('Error in anticall command:', error);
        return await reply('❌ Error occurred while managing anti-call settings!\n' + error.message, {
            externalAdReply: {
                title: "Error",
                body: "Failed to update settings",
                thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
}

// Function to check if anti-call is enabled
function isAnticallEnabled() {
    try {
        if (!fs.existsSync(configPath)) {
            return false;
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.enabled || false;
    } catch (error) {
        console.error('Error checking anticall config:', error);
        return false;
    }
}

// Function to handle incoming calls - This will be integrated into server.js
async function handleIncomingCall(sock, callUpdate) {
    try {
        if (!isAnticallEnabled()) {
            return;
        }

        if (callUpdate.status === 'offer') {
            const callId = callUpdate.id;
            const from = callUpdate.from;
            
            console.log(`📵 Anti-call: Rejecting call from ${from}`);
            
            // Reject the call
            await sock.rejectCall(callId, from);
            
            // Send message to the caller with your newsletter style
            await sock.sendMessage(from, {
                text: '📵 *ANTI-CALL IS ACTIVE*\n\nSorry, i do not  accept calls. Please send a text message instead.',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363401559573199@newsletter',
                        newsletterName: 'BrenaldMedia',
                        serverMessageId: -1
                    }
                }
            });
            
            console.log(`✅ Call rejected and message sent to: ${from.split('@')[0]}`);
        }

    } catch (error) {
        console.error('❌ Error in anti-call handler:', error.message);
    }
}

module.exports = {
    name: 'anticall',
    description: 'Enable/disable anti-call feature',
    usage: 'anticall <on/off>',
    category: 'Owner',
    ownerOnly: true,
    execute: anticallCommand,
    isAnticallEnabled,
    handleIncomingCall
};
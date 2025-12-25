// commands/whitelist.js - Whitelist Check Command
const { isAllowedForChreact } = require('../server');

// Function to send messages with YOUR preferred context style
async function sendMessageWithContext(conn, jid, text, options = {}) {
    const contextInfo = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200,
        }
    };
    
    // Add externalAdReply if provided
    if (options.externalAdReply) {
        contextInfo.externalAdReply = options.externalAdReply;
    }
    
    return conn.sendMessage(jid, { 
        text,
        contextInfo
    }, options.quoted ? { quoted: options.quoted } : {});
}

module.exports = {
    name: 'checkaccess',
    pattern: ['checkaccess', 'access', 'myaccess'],
    description: 'Check your access level for commands',
    category: 'General',
    ownerOnly: false,
    
    async execute(sock, message, args, context) {
        try {
            const { from, sender, userSettings, userPrefix, isBotOwner } = context;
            const { isPremium } = require('../server');
            
            // Check access levels
            const ownerStatus = await isBotOwner();
            const premiumStatus = isPremium(sender);
            const whitelistStatus = isAllowedForChreact(sender);
            
            let accessLevel = 'Regular User';
            let emoji = '👤';
            let features = 'Basic commands only';
            
            if (ownerStatus) {
                accessLevel = 'Bot Owner 👑';
                emoji = '👑';
                features = 'All commands + Owner privileges';
            } else if (premiumStatus) {
                accessLevel = 'Premium User 🎖️';
                emoji = '🎖️';
                features = 'All commands including premium';
            } else if (whitelistStatus) {
                accessLevel = 'Whitelisted User ✅';
                emoji = '✅';
                features = 'Channel react command access';
            }
            
            // Get user number for display
            let userNumber = '';
            if (sender.includes(':')) {
                userNumber = sender.split(':')[0];
            } else {
                userNumber = sender.split('@')[0];
            }
            userNumber = userNumber.replace(/\D/g, '');
            
            await sendMessageWithContext(sock, from,
                `🔐 *ACCESS LEVEL CHECK*\n\n` +
                `📱 *Your Number:* +${userNumber}\n` +
                `📊 *Access Level:* ${accessLevel} ${emoji}\n` +
                `🎯 *Features:* ${features}\n\n` +
                `*Command Access:*\n` +
                `• Basic Commands: ✅ Always\n` +
                `• .chreact command: ${ownerStatus || premiumStatus || whitelistStatus ? '✅ YES' : '❌ NO'}\n` +
                `• Owner Commands: ${ownerStatus ? '✅ YES' : '❌ NO'}\n\n` +
                `*Whitelisted Numbers:*\n` +
                `• +234 812 510 1930\n` +
                `• +234 815 022 1529`, {
                quoted: message,
                externalAdReply: {
                    title: "Access Level",
                    body: `${accessLevel}`,
                    thumbnailUrl: userSettings.botImage || "https://files.catbox.moe/zlu6dx.jpg",
                    sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                    mediaType: 1
                }
            });
            
        } catch (error) {
            console.error('Error in checkaccess command:', error);
            await sendMessageWithContext(sock, message.key.remoteJid,
                `❌ Error checking access: ${error.message}`, {
                quoted: message
            });
        }
    }
};
// === owner.js ===
module.exports = {
    pattern: 'owner',
    description: 'Get bot owner information with vcard contact',
    alias: ['creator', 'dev', 'developer', 'contact'],
    category: 'info',
    react: '👑',
    filename: __filename,
    use: '.owner',

    execute: async (conn, message, m, { args, q, reply, from, isGroup, groupMetadata, sender, isAdmins, isCreator, sessionId }) => {
        try {
            // Get bot's phone number from connection
            const botJid = conn.user.id;
            const botNumber = botJid.split(':')[0] || botJid.split('@')[0];
            
            // Get bot settings from server
            const server = require('../server');
            const userSettings = server.getUserSettings(sessionId);
            
            // Use custom names if set, otherwise use defaults
            const botName = userSettings.botName || server.BOT_NAME;
            const ownerName = userSettings.ownerName || server.OWNER_NAME;
            const developer = server.DEV;

            // Create vcard for owner contact
            const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:${botName} Bot Developer
TEL;type=CELL;type=VOICE;type=pref:${botNumber}
NOTE:${botName} WhatsApp Bot Owner
END:VCARD
            `.trim();

            // Send vcard contact FIRST
            await conn.sendMessage(from, {
                contacts: {
                    displayName: ownerName,
                    contacts: [{
                        displayName: ownerName,
                        vcard: vcard
                    }]
                }
            }, { quoted: message });

            // Then send owner information with context info
            await conn.sendMessage(from, {
                text: `👑 *BOT OWNER INFORMATION*\n\n📱 *Connected Number:* ${botNumber}\n🤖 *Bot Name:* ${botName}\n👤 *Owner:* ${ownerName}\n🔧 *Developer:* ${developer}\n\n📇 *Contact card sent above* 👆`,
                contextInfo: {
                    externalAdReply: {
                        title: `👑 ${ownerName}`,
                        body: `${botName} Bot Owner`,
                        thumbnailUrl: userSettings.botImage || server.MENU_IMAGE_URL,
                        sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                        mediaType: 1
                    }
                }
            }, { quoted: message });

        } catch (error) {
            console.error('Error in owner command:', error);
            
            // Fallback if we can't get the connected number
            const server = require('../server');
            const userSettings = server.getUserSettings(sessionId);
            
            const botName = userSettings.botName || process.env.BOT_NAME || "TRACLE - LITE";
            const ownerName = userSettings.ownerName || process.env.OWNER_NAME || "Brenaldmedia";
            const developer = process.env.DEV || 'Brenaldmedia';

            // Fallback vcard
            try {
                const fallbackVcard = `
BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:${botName} Bot Developer
NOTE:${botName} WhatsApp Bot Owner
END:VCARD
                `.trim();

                await conn.sendMessage(from, {
                    contacts: {
                        displayName: ownerName,
                        contacts: [{
                            displayName: ownerName,
                            vcard: fallbackVcard
                        }]
                    }
                }, { quoted: message });

                // Send fallback owner information with context info
                await conn.sendMessage(from, {
                    text: `👑 *BOT OWNER INFORMATION*\n\n🤖 *Bot Name:* ${botName}\n👤 *Owner:* ${ownerName}\n🔧 *Developer:* ${developer}\n\n📇 *Contact card sent above* 👆`,
                    contextInfo: {
                        externalAdReply: {
                            title: `👑 ${ownerName}`,
                            body: `${botName} Bot Owner`,
                            thumbnailUrl: userSettings.botImage || server.MENU_IMAGE_URL,
                            sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                            mediaType: 1
                        }
                    }
                }, { quoted: message });

            } catch (vcardError) {
                console.error('Failed to send vcard:', vcardError);
                
                // If vcard fails completely, send just the text
                await conn.sendMessage(from, {
                    text: `👑 *BOT OWNER INFORMATION*\n\n🤖 *Bot Name:* ${botName}\n👤 *Owner:* ${ownerName}\n🔧 *Developer:* ${developer}\n\n⚠️ *Failed to send contact card*`,
                    contextInfo: {
                        externalAdReply: {
                            title: `👑 ${ownerName}`,
                            body: `${botName} Bot Owner`,
                            thumbnailUrl: userSettings.botImage || server.MENU_IMAGE_URL,
                            sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                            mediaType: 1
                        }
                    }
                }, { quoted: message });
            }
        }
    },
    tags: ['info', 'utility']
};
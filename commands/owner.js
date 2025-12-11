module.exports = {
    pattern: "owner",
    name: "owner",
    description: "Show owner information",
    tags: ["info"],
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { BOT_NAME, OWNER_NAME, MENU_IMAGE_URL, REPO_LINK, DEV } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            
            const botJid = conn.user.id;
            const botNumber = botJid.split(':')[0] || botJid.split('@')[0];
            
            const ownerInfo = `👑 *BOT OWNER INFORMATION*\n\n📱 Connected Number: *${botNumber}*\n🤖 Bot Name: *${userSettings.botName || BOT_NAME}*\n👤 Owner: *${userSettings.ownerName || OWNER_NAME}*\n🔧 Developer: *${DEV}*`;
            
            await reply(ownerInfo, {
                contextInfo: {
                    externalAdReply: {
                        title: "👑 Bot Owner",
                        body: `Connected: ${botNumber}`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                }
            });
            
            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${userSettings.ownerName || OWNER_NAME}\nORG:${userSettings.botName || BOT_NAME}\nTEL;type=CELL;type=VOICE;waid=${botNumber}:+${botNumber}\nEND:VCARD`;
            
            await conn.sendMessage(from, {
                contacts: {
                    displayName: userSettings.ownerName || OWNER_NAME,
                    contacts: [{ vcard }]
                }
            }, { quoted: message });
            
        } catch (error) {
            console.error("Error in owner command:", error);
            await reply(`👑 *BOT OWNER*\n\n🤖 Bot Name: *${userSettings.botName || BOT_NAME}*\n👤 Owner: *${userSettings.ownerName || OWNER_NAME}*\n🔧 Developer: *${DEV}*`);
        }
    }
};
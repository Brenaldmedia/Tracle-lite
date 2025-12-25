// commands/creategc.js (with BRENALDMEDIA newsletter)
const moment = require('moment-timezone');

async function creategcCommand(conn, message, m, context) {
    try {
        const { args, from, reply, sessionId, isBotOwner } = context;
        
        // Check if sender is owner
        const isOwner = isBotOwner();
        
        if (!isOwner) {
            return await reply('❌ 𝐓𝐡𝐢𝐬 𝐂𝐨𝐦𝐦𝐚𝐧𝐝 𝐂𝐚𝐧 𝐁𝐞 𝐔𝐬𝐞𝐝 𝐎𝐧𝐥𝐲 𝐁𝐲 𝐌𝐲 𝐎𝐰𝐧𝐞𝐫 𝐎𝐧𝐥𝐲!', {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363401559573199@newsletter',
                        newsletterName: 'BrenaldMedia',
                        serverMessageId: -1
                    }
                },
                externalAdReply: {
                    title: "Permission Denied",
                    body: "Owner only command",
                    thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }

        // Get group name from arguments
        const groupName = args.join(" ").trim();

        if (!groupName) {
            return await reply(
                '❌ Please provide a group name!\n\n' +
                `*Usage:* ${context.userPrefix || context.PREFIX}creategc groupname\n` +
                `*Example:* ${context.userPrefix || context.PREFIX}creategc My Awesome Group`,
                {
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363401559573199@newsletter',
                            newsletterName: 'BrenaldMedia',
                            serverMessageId: -1
                        }
                    },
                    externalAdReply: {
                        title: "Create Group",
                        body: "Provide a group name",
                        thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                        sourceUrl: context.REPO_LINK,
                        mediaType: 1
                    }
                }
            );
        }

        try {
            // Create the group
            console.log(`🔄 Creating group: "${groupName}" for session: ${sessionId}`);
            const cret = await conn.groupCreate(groupName, []);
            
            // Get the invite code
            const response = await conn.groupInviteCode(cret.id);
            
            // Format the creation time
            const creationTime = moment(cret.creation * 1000)
                .tz("Africa/Lagos")
                .format("DD/MM/YYYY HH:mm:ss");
            
            // Create response message
            const teks = `
     「 *Create Group* 」

▸ *Name* : ${cret.subject}
▸ *Owner* : @${cret.owner.split("@")[0]}
▸ *Creation* : ${creationTime}

*Group Link:*
https://chat.whatsapp.com/${response}
       `;

            // Send the response with mentions
            await conn.sendMessage(from, { 
                text: teks, 
                mentions: [cret.owner],
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363401559573199@newsletter',
                        newsletterName: 'BrenaldMedia',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });

            console.log(`✅ Group created successfully: ${cret.id}`);

        } catch (createError) {
            console.error('Group creation error:', createError);
            
            let errorMessage = '❌ Error creating group!\n\nPossible reasons:\n';
            
            if (createError.message.includes('name too long')) {
                errorMessage += '- Group name is too long (max 25 characters)\n';
            } else if (createError.message.includes('invalid') || createError.message.includes('contains')) {
                errorMessage += '- Group name contains invalid characters\n';
            } else if (createError.message.includes('rate limit') || createError.message.includes('too many')) {
                errorMessage += '- Rate limit reached, try again later\n';
            } else if (createError.message.includes('connection') || createError.message.includes('network')) {
                errorMessage += '- Network connection issues\n';
            } else {
                errorMessage += `- ${createError.message}\n`;
            }
            
            errorMessage += '\nPlease try again with a different group name.';
            
            await reply(errorMessage, {
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363401559573199@newsletter',
                        newsletterName: 'BrenaldMedia',
                        serverMessageId: -1
                    }
                },
                externalAdReply: {
                    title: "Creation Failed",
                    body: "Could not create group",
                    thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }

    } catch (error) {
        console.error('Error in creategc command:', error);
        await reply('❌ An error occurred while creating the group!\n' + error.message, {
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363401559573199@newsletter',
                    newsletterName: 'BrenaldMedia',
                    serverMessageId: -1
                }
            },
            externalAdReply: {
                title: "Error",
                body: "Failed to create group",
                thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
}

module.exports = {
    name: 'creategc',
    description: 'Create a new WhatsApp group',
    usage: 'creategc <group name>',
    category: 'Owner',
    ownerOnly: true,
    execute: creategcCommand
};
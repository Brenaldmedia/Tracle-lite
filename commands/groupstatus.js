const { downloadContentFromMessage, generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

// Store last used group for each user in DM
const userLastGroup = new Map();

module.exports = {
    pattern: "groupstatus",
    desc: "Send message as group status/announcement - Supports DM with group link/JID",
    category: "group",
    react: "📢",
    filename: __filename,
    use: "[group link or JID] [caption] | reply to media",
    
    execute: async (conn, message, m, context) => {
        try {
            const { from, reply, q, isGroup, isAdmins, isCreator, sessionId } = context;
            
            console.log(`🔍 groupstatus called - Is Group: ${isGroup}`);
            console.log(`📝 Raw command text: "${q}"`);
            console.log(`📝 Has quoted message: ${!!m.quoted}`);
            
            let targetGroupJid = null;
            let userCaption = "";
            let commandText = (q || "").trim();
            
            // =============== IN DM ===============
            if (!isGroup) {
                console.log(`📱 DM Mode`);
                
                // Check for group JID in command
                const groupJidMatch = commandText.match(/([0-9]+@g\.us)/);
                const groupLinkMatch = commandText.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
                
                // CASE 1: User is replying to a message (image/video/text)
                if (m.quoted) {
                    console.log(`📎 Replying to a message`);
                    
                    // If user provided a group JID/link in the command
                    if (groupJidMatch) {
                        targetGroupJid = groupJidMatch[1];
                        // Remove JID from command to get caption
                        userCaption = commandText.replace(groupJidMatch[0], '').trim();
                        console.log(`📋 Using JID from command: ${targetGroupJid}`);
                        console.log(`📝 Caption from command: "${userCaption}"`);
                    } 
                    else if (groupLinkMatch) {
                        const fullLink = groupLinkMatch[0];
                        const inviteCode = groupLinkMatch[1];
                        userCaption = commandText.replace(fullLink, '').trim();
                        console.log(`🔗 Using link from command`);
                        console.log(`📝 Caption from command: "${userCaption}"`);
                        
                        // Get group JID from link
                        try {
                            const inviteInfo = await conn.groupGetInviteInfo(inviteCode);
                            targetGroupJid = inviteInfo.id;
                        } catch (e) {
                            try {
                                const groupInfo = await conn.groupAcceptInvite(inviteCode);
                                targetGroupJid = groupInfo.gid || groupInfo;
                            } catch (acceptError) {
                                const allGroups = await conn.groupFetchAllParticipating();
                                for (const [jid, group] of Object.entries(allGroups)) {
                                    try {
                                        const code = await conn.groupGetInviteCode(jid);
                                        if (code === inviteCode) {
                                            targetGroupJid = jid;
                                            break;
                                        }
                                    } catch (err) {}
                                }
                            }
                        }
                    }
                    // No group specified - use last used group
                    else if (userLastGroup.has(from)) {
                        targetGroupJid = userLastGroup.get(from);
                        userCaption = commandText; // Everything in command becomes caption
                        console.log(`📋 Using last group: ${targetGroupJid}`);
                        console.log(`📝 Caption from command: "${userCaption}"`);
                    }
                    // No group at all
                    else {
                        return reply(`❌ *No group specified!*\n\n${getDMHelpText()}\n\n💡 *Tip:* First send a group status with the group JID/link, then you can reply without retyping it.`);
                    }
                }
                // CASE 2: No reply - user is sending text or setting up
                else {
                    // Try to get group from command
                    if (groupJidMatch) {
                        targetGroupJid = groupJidMatch[1];
                        userCaption = commandText.replace(groupJidMatch[0], '').trim();
                        // Save this as last used group
                        userLastGroup.set(from, targetGroupJid);
                        console.log(`📋 Setting new group: ${targetGroupJid}`);
                        console.log(`📝 Text caption: "${userCaption}"`);
                    }
                    else if (groupLinkMatch) {
                        const fullLink = groupLinkMatch[0];
                        const inviteCode = groupLinkMatch[1];
                        userCaption = commandText.replace(fullLink, '').trim();
                        
                        try {
                            const inviteInfo = await conn.groupGetInviteInfo(inviteCode);
                            targetGroupJid = inviteInfo.id;
                            userLastGroup.set(from, targetGroupJid);
                        } catch (e) {
                            try {
                                const groupInfo = await conn.groupAcceptInvite(inviteCode);
                                targetGroupJid = groupInfo.gid || groupInfo;
                                userLastGroup.set(from, targetGroupJid);
                            } catch (acceptError) {
                                return reply(`❌ *Invalid group link!*`);
                            }
                        }
                        console.log(`🔗 Link resolved to: ${targetGroupJid}`);
                        console.log(`📝 Text caption: "${userCaption}"`);
                    }
                    else {
                        return reply(getDMHelpText());
                    }
                }
                
                // Verify group is valid
                if (!targetGroupJid || !targetGroupJid.includes('@g.us')) {
                    return reply(`❌ *Invalid group!*`);
                }
                
                // Verify bot is in group
                try {
                    const metadata = await conn.groupMetadata(targetGroupJid);
                    console.log(`✅ Verified in group: ${metadata.subject}`);
                } catch (error) {
                    return reply(`❌ *Bot is not in this group!*`);
                }
            }
            
            // =============== IN GROUP ===============
            else {
                targetGroupJid = from;
                userCaption = commandText;
                console.log(`👥 In-group mode`);
                console.log(`📝 Caption: "${userCaption}"`);
                
                if (!isAdmins && !isCreator) {
                    return reply("❌ *Only admins can use this!*");
                }
            }
            
            // =============== BUILD PAYLOAD ===============
            const quotedMessage = m.quoted;
            
            if (!quotedMessage && !userCaption) {
                return reply(isGroup ? getHelpText() : getDMHelpText());
            }
            
            let payload = null;
            
            // CASE: Replying to a message
            if (quotedMessage) {
                try {
                    payload = await buildPayloadFromQuoted(conn, quotedMessage, sessionId);
                    
                    let mediaType = payload?.video ? 'video' : payload?.image ? 'image' : payload?.audio ? 'audio' : 'text';
                    console.log(`✅ Payload type: ${mediaType}`);
                    
                    // Get original caption from media
                    let originalCaption = "";
                    if (payload?.video && payload.video.caption) {
                        originalCaption = payload.video.caption;
                        console.log(`📝 Original video caption: "${originalCaption}"`);
                    } else if (payload?.image && payload.image.caption) {
                        originalCaption = payload.image.caption;
                        console.log(`📝 Original image caption: "${originalCaption}"`);
                    }
                    
                    console.log(`📝 User typed caption: "${userCaption}"`);
                    
                    // Determine final caption - PRIORITY:
                    // 1. User's typed caption (if any and not containing group identifiers)
                    // 2. Original media caption
                    // 3. No caption
                    let finalCaption = "";
                    
                    // Check if userCaption is just whitespace or empty
                    if (userCaption && userCaption.length > 0 && !userCaption.match(/^https?:\/\//) && !userCaption.match(/@g\.us/)) {
                        finalCaption = userCaption;
                        console.log(`✅ Using user caption`);
                    } 
                    else if (originalCaption && originalCaption.length > 0) {
                        finalCaption = originalCaption;
                        console.log(`✅ Using original media caption`);
                    }
                    else {
                        console.log(`ℹ️ No caption`);
                    }
                    
                    // Apply caption to payload
                    if (finalCaption && (payload?.video || payload?.image)) {
                        payload.caption = finalCaption;
                        console.log(`✅ Final caption: "${finalCaption.substring(0, 50)}"`);
                    }
                    
                } catch (error) {
                    console.error("Error building payload:", error);
                    return reply(`❌ *Failed to process media:* ${error.message}`);
                }
            } 
            // CASE: Plain text message
            else if (userCaption) {
                payload = { text: userCaption };
                console.log(`✅ Text payload: "${userCaption.substring(0, 50)}"`);
            }
            
            if (!payload) {
                return reply(isGroup ? getHelpText() : getDMHelpText());
            }
            
            // =============== SEND GROUP STATUS ===============
            await reply(`⏳ *Sending...*`);
            
            try {
                await sendGroupStatus(conn, targetGroupJid, payload);
                
                // Get group name
                let groupName = targetGroupJid.split('@')[0];
                try {
                    const metadata = await conn.groupMetadata(targetGroupJid);
                    groupName = metadata.subject;
                } catch (e) {}
                
                const mediaType = detectMediaType(quotedMessage, payload);
                let successMsg = `✅ *${mediaType} sent to ${groupName}*`;
                
                if (payload.caption) {
                    const shortCaption = payload.caption.length > 50 ? payload.caption.substring(0, 50) + '...' : payload.caption;
                    successMsg += `\n📝 "${shortCaption}"`;
                }
                
                await reply(successMsg);
                
                await conn.sendMessage(from, {
                    react: { text: "✅", key: message.key }
                }).catch(() => {});
                
            } catch (error) {
                console.error("Send error:", error);
                await reply(`❌ *Failed:* ${error.message}`);
                
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                }).catch(() => {});
            }
            
        } catch (error) {
            console.error('Error:', error);
            
            try {
                await context.reply(`❌ *Error:* ${error.message}`);
            } catch (e) {}
            
            try {
                await conn.sendMessage(context.from, {
                    react: { text: "❌", key: message.key }
                });
            } catch (e) {}
        }
    }
};

/* ------------------ HELPER FUNCTIONS ------------------ */

function getHelpText() {
    return `📢 *GROUP STATUS* (In Group)\n\n` +
           `• Reply to image/video → .groupstatus\n` +
           `• Reply with caption → .groupstatus Your caption\n` +
           `• Text → .groupstatus Your message`;
}

function getDMHelpText() {
    return `📢 *GROUP STATUS* (From DM)\n\n` +
           `*First time - Set group:*\n` +
           `.groupstatus 120363423778157947@g.us\n\n` +
           `*Send text:*\n` +
           `.groupstatus 120363423778157947@g.us Hello group!\n\n` +
           `*Reply to image/video:*\n` +
           `1. Reply to image → .groupstatus\n` +
           `2. Or add caption → .groupstatus My caption\n\n` +
           `💡 *After first send, just reply without typing the JID again!*`;
}

async function buildPayloadFromQuoted(conn, quotedMessage, sessionId) {
    try {
        if (quotedMessage.videoMessage) {
            const buffer = await downloadToBuffer(conn, quotedMessage.videoMessage, 'video', sessionId);
            return { 
                video: buffer, 
                caption: quotedMessage.videoMessage.caption || '',
                gifPlayback: quotedMessage.videoMessage.gifPlayback || false,
                mimetype: quotedMessage.videoMessage.mimetype || 'video/mp4'
            };
        }
        else if (quotedMessage.imageMessage) {
            const buffer = await downloadToBuffer(conn, quotedMessage.imageMessage, 'image', sessionId);
            return { 
                image: buffer, 
                caption: quotedMessage.imageMessage.caption || '',
                mimetype: quotedMessage.imageMessage.mimetype || 'image/jpeg'
            };
        }
        else if (quotedMessage.audioMessage) {
            const buffer = await downloadToBuffer(conn, quotedMessage.audioMessage, 'audio', sessionId);
            
            if (quotedMessage.audioMessage.ptt) {
                const audioVn = await toVN(buffer);
                return { 
                    audio: audioVn, 
                    mimetype: "audio/ogg; codecs=opus", 
                    ptt: true 
                };
            } else {
                return { 
                    audio: buffer, 
                    mimetype: quotedMessage.audioMessage.mimetype || 'audio/mpeg',
                    ptt: false 
                };
            }
        }
        else if (quotedMessage.conversation || quotedMessage.extendedTextMessage?.text) {
            const textContent = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
            return { text: textContent };
        }
        else if (quotedMessage.viewOnceMessageV2 || quotedMessage.viewOnceMessage) {
            let viewOnceContent = quotedMessage.viewOnceMessageV2?.message || quotedMessage.viewOnceMessage?.message || quotedMessage.viewOnceMessage;
            
            if (viewOnceContent?.imageMessage) {
                const buffer = await downloadToBuffer(conn, viewOnceContent.imageMessage, 'image', sessionId);
                return { image: buffer, caption: viewOnceContent.imageMessage.caption || '' };
            }
            else if (viewOnceContent?.videoMessage) {
                const buffer = await downloadToBuffer(conn, viewOnceContent.videoMessage, 'video', sessionId);
                return { video: buffer, caption: viewOnceContent.videoMessage.caption || '' };
            }
        }
        
        return null;
        
    } catch (error) {
        console.error("Error building payload:", error);
        throw error;
    }
}

function detectMediaType(quotedMessage, payload = null) {
    if (!quotedMessage && payload?.text) return 'Text';
    if (quotedMessage?.videoMessage) return 'Video';
    if (quotedMessage?.imageMessage) return 'Image';
    if (quotedMessage?.audioMessage) return 'Audio';
    return 'Text';
}

async function downloadToBuffer(conn, message, type, sessionId) {
    const stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

async function sendGroupStatus(conn, jid, content) {
    const inside = await generateWAMessageContent(content, { upload: conn.waUploadToServer });
    const messageSecret = crypto.randomBytes(32);

    const m = generateWAMessageFromContent(jid, {
        messageContextInfo: { messageSecret },
        groupStatusMessageV2: { message: { ...inside, messageContextInfo: { messageSecret } } }
    }, {});

    await conn.relayMessage(jid, m.message, { messageId: m.key.id });
    return m;
}

async function toVN(inputBuffer) {
    return new Promise((resolve, reject) => {
        const inStream = new PassThrough();
        inStream.end(inputBuffer);
        const outStream = new PassThrough();
        const chunks = [];

        ffmpeg(inStream)
            .noVideo()
            .audioCodec("libopus")
            .format("ogg")
            .audioBitrate("48k")
            .audioChannels(1)
            .audioFrequency(48000)
            .on("error", reject)
            .on("end", () => resolve(Buffer.concat(chunks)))
            .pipe(outStream, { end: true });

        outStream.on("data", chunk => chunks.push(chunk));
    });
}
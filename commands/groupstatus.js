const { downloadContentFromMessage, generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

module.exports = {
    pattern: "groupstatus",
    desc: "Send message as group status/announcement (Admin only)",
    category: "group",
    react: "📢",
    filename: __filename,
    use: "<text> or <reply to media>",
    
    execute: async (conn, message, m, context) => {
        try {
            const { from, reply, q, isGroup, isAdmins, isCreator, sessionId } = context;
            
            console.log(`🔍 groupstatus command called in session ${sessionId}`);
            
            // ✅ Check if it's a group
            if (!isGroup) {
                return reply("❌ *This command can only be used in groups!*");
            }

            // ✅ Check if user is admin
            if (!isAdmins && !isCreator) {
                return reply("❌ *Only group admins can use this command!*");
            }

            const quotedMessage = m.quoted;
            
            // ✅ Check if there's any content (quoted message or text)
            if (!quotedMessage && !q) {
                console.log(`⚠️ No content provided for groupstatus command`);
                return reply(getHelpText());
            }

            let payload = null;
            let commandText = q || "";
            
            console.log(`📋 Processing groupstatus: hasQuoted=${!!quotedMessage}, hasText=${!!commandText}`);
            
            // ✅ Handle quoted message
            if (quotedMessage) {
                try {
                    payload = await buildPayloadFromQuoted(conn, quotedMessage, sessionId);
                    console.log(`✅ Payload built from quoted message, type: ${payload?.text ? 'text' : payload?.image ? 'image' : payload?.video ? 'video' : payload?.audio ? 'audio' : 'unknown'}`);
                    
                    // ✅ Add caption from command text if provided
                    if (commandText && payload) {
                        if (payload.video || payload.image) {
                            payload.caption = commandText;
                            console.log(`✅ Added caption to payload: "${commandText}"`);
                        }
                    }
                } catch (quotedError) {
                    console.error("Error building payload from quoted message:", quotedError);
                }
            } 
            // ✅ Handle plain text command
            else if (commandText) {
                payload = { text: commandText };
                console.log(`✅ Created text payload: "${commandText.substring(0, 50)}${commandText.length > 50 ? '...' : ''}"`);
            }

            if (!payload) {
                console.log(`❌ No payload created for groupstatus`);
                return reply(getHelpText());
            }

            // ✅ Send group status
            await reply("⏳ *Sending group status...*");
            
            try {
                await sendGroupStatus(conn, from, payload);
                
                const mediaType = detectMediaType(quotedMessage, payload);
                let successMsg = `✅ *${mediaType} group status sent successfully!*`;
                
                if (payload.caption) {
                    successMsg += `\n\n📝 *Caption:* "${payload.caption}"`;
                }
                
                await reply(successMsg);
                console.log(`✅ Group status sent successfully: ${mediaType}`);
                
                // React with success
                await conn.sendMessage(from, {
                    react: { text: "✅", key: message.key }
                }).catch(() => {});
                
            } catch (error) {
                console.error("Group status send error:", error);
                await reply(`❌ *Failed to send group status:* ${error.message}`);
                
                // React with error
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                }).catch(() => {});
            }

        } catch (error) {
            console.error('Error in group status command:', error);
            
            try {
                if (context && context.reply) {
                    await context.reply(`❌ *Error:* ${error.message}`);
                }
            } catch (e) {}
            
            // React with error
            try {
                await conn.sendMessage(context.from, {
                    react: { text: "❌", key: message.key }
                });
            } catch (e) {}
        }
    }
};

/* ------------------ Helper Functions ------------------ */

function getHelpText() {
    return `📢 *GROUP STATUS COMMAND*\n\n` +
           `*Usage:*\n` +
           `• Reply to any media (image/video/audio) with .groupstatus\n` +
           `• Or type: .groupstatus [your message]\n\n` +
           `*Examples:*\n` +
           `• Reply to image with: .groupstatus\n` +
           `• With caption: .groupstatus Announcement message\n` +
           `• Text only: .groupstatus Important group announcement\n\n` +
           `⚠️ *Note:* Only group admins can use this command.`;
}

async function buildPayloadFromQuoted(conn, quotedMessage, sessionId) {
    try {
        console.log(`🔧 Building payload from quoted message, checking type...`);
        
        if (quotedMessage.videoMessage) {
            console.log(`📹 Processing video message`);
            const buffer = await downloadToBuffer(conn, quotedMessage.videoMessage, 'video', sessionId);
            return { 
                video: buffer, 
                caption: quotedMessage.videoMessage.caption || '',
                gifPlayback: quotedMessage.videoMessage.gifPlayback || false,
                mimetype: quotedMessage.videoMessage.mimetype || 'video/mp4'
            };
        }
        else if (quotedMessage.imageMessage) {
            console.log(`🖼️ Processing image message`);
            const buffer = await downloadToBuffer(conn, quotedMessage.imageMessage, 'image', sessionId);
            return { 
                image: buffer, 
                caption: quotedMessage.imageMessage.caption || '',
                mimetype: quotedMessage.imageMessage.mimetype || 'image/jpeg'
            };
        }
        else if (quotedMessage.audioMessage) {
            console.log(`🎵 Processing audio message`);
            const buffer = await downloadToBuffer(conn, quotedMessage.audioMessage, 'audio', sessionId);
            
            if (quotedMessage.audioMessage.ptt) {
                console.log(`🎤 Converting to voice note`);
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
            console.log(`📝 Processing text message`);
            const textContent = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
            return { text: textContent };
        } else {
            console.log(`⚠️ Unknown quoted message type:`, Object.keys(quotedMessage));
        }
        
        return null;
        
    } catch (error) {
        console.error("Error building payload:", error);
        throw new Error(`Failed to process media: ${error.message}`);
    }
}

function detectMediaType(quotedMessage, payload = null) {
    if (!quotedMessage) return 'Text';
    if (quotedMessage.videoMessage) return 'Video';
    if (quotedMessage.imageMessage) return 'Image';
    if (quotedMessage.audioMessage) return 'Audio';
    return 'Text';
}

async function downloadToBuffer(conn, message, type, sessionId) {
    try {
        console.log(`⬇️ Downloading ${type} for session ${sessionId}`);
        const stream = await downloadContentFromMessage(message, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        console.log(`✅ Downloaded ${type}, size: ${buffer.length} bytes`);
        return buffer;
    } catch (error) {
        console.error(`Download error for session ${sessionId}:`, error);
        throw new Error(`Failed to download ${type}: ${error.message}`);
    }
}

async function sendGroupStatus(conn, jid, content) {
    try {
        console.log(`📤 Sending group status to ${jid}`);
        const inside = await generateWAMessageContent(content, { upload: conn.waUploadToServer });
        const messageSecret = crypto.randomBytes(32);

        const m = generateWAMessageFromContent(jid, {
            messageContextInfo: { messageSecret },
            groupStatusMessageV2: { message: { ...inside, messageContextInfo: { messageSecret } } }
        }, {});

        await conn.relayMessage(jid, m.message, { messageId: m.key.id });
        console.log(`✅ Group status relayed successfully`);
        return m;
    } catch (error) {
        console.error("Send group status error:", error);
        throw new Error(`Failed to send group status: ${error.message}`);
    }
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
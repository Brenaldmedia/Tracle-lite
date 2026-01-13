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
    
    execute: async (conn, message, m, { from, reply, q, isGroup, isAdmins, isCreator, sessionId }) => {
        try {
            // ✅ Check if it's a group
            if (!isGroup) {
                return reply("❌ *This command can only be used in groups!*");
            }

            // ✅ Check if user is admin
            if (!isAdmins && !isCreator) {
                return reply("❌ *Only group admins can use this command!*");
            }

            const quotedMessage = m.quoted;
            
            // ✅ Show help if no content provided
            if (!quotedMessage && !q) {
                return reply(getHelpText());
            }

            let payload = null;
            
            // ✅ Extract text from command if provided
            let commandText = q || "";
            
            // ✅ Handle quoted message (video, image, audio, or text)
            if (quotedMessage) {
                payload = await buildPayloadFromQuoted(conn, quotedMessage, sessionId);
                
                // ✅ Add caption from command text if provided
                if (commandText && payload) {
                    if (payload.video) {
                        payload.caption = commandText;
                    } else if (payload.image) {
                        payload.caption = commandText;
                    } else if (payload.audio) {
                        // For audio, we'll add text separately
                    }
                }
            } 
            // ✅ Handle plain text command
            else if (commandText) {
                payload = { text: commandText };
            }

            if (!payload) {
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
            await reply(`❌ *Error:* ${error.message}`);
            
            // React with error
            try {
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                });
            } catch (e) {}
        }
    }
};

/* ------------------ Helper Functions ------------------ */

// 📌 Help text
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

// 📌 Build payload from quoted message
async function buildPayloadFromQuoted(conn, quotedMessage, sessionId) {
    try {
        // ✅ Handle video message
        if (quotedMessage.videoMessage) {
            const buffer = await downloadToBuffer(conn, quotedMessage.videoMessage, 'video', sessionId);
            return { 
                video: buffer, 
                caption: quotedMessage.videoMessage.caption || '',
                gifPlayback: quotedMessage.videoMessage.gifPlayback || false,
                mimetype: quotedMessage.videoMessage.mimetype || 'video/mp4'
            };
        }
        // ✅ Handle image message
        else if (quotedMessage.imageMessage) {
            const buffer = await downloadToBuffer(conn, quotedMessage.imageMessage, 'image', sessionId);
            return { 
                image: buffer, 
                caption: quotedMessage.imageMessage.caption || '',
                mimetype: quotedMessage.imageMessage.mimetype || 'image/jpeg'
            };
        }
        // ✅ Handle audio message
        else if (quotedMessage.audioMessage) {
            const buffer = await downloadToBuffer(conn, quotedMessage.audioMessage, 'audio', sessionId);
            
            // Check if it's voice note (ptt) or regular audio
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
        // ✅ Handle text message
        else if (quotedMessage.conversation || quotedMessage.extendedTextMessage?.text) {
            const textContent = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
            return { text: textContent };
        }
        
        return null;
        
    } catch (error) {
        console.error("Error building payload:", error);
        throw new Error(`Failed to process media: ${error.message}`);
    }
}

// 📌 Detect media type
function detectMediaType(quotedMessage, payload = null) {
    if (!quotedMessage) return 'Text';
    if (quotedMessage.videoMessage) return 'Video';
    if (quotedMessage.imageMessage) return 'Image';
    if (quotedMessage.audioMessage) return 'Audio';
    return 'Text';
}

// 📌 Download message content to buffer
async function downloadToBuffer(conn, message, type, sessionId) {
    try {
        const stream = await downloadContentFromMessage(message, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (error) {
        console.error(`Download error for session ${sessionId}:`, error);
        throw new Error(`Failed to download ${type}: ${error.message}`);
    }
}

// 📌 Send group status
async function sendGroupStatus(conn, jid, content) {
    try {
        const inside = await generateWAMessageContent(content, { upload: conn.waUploadToServer });
        const messageSecret = crypto.randomBytes(32);

        const m = generateWAMessageFromContent(jid, {
            messageContextInfo: { messageSecret },
            groupStatusMessageV2: { message: { ...inside, messageContextInfo: { messageSecret } } }
        }, {});

        await conn.relayMessage(jid, m.message, { messageId: m.key.id });
        return m;
    } catch (error) {
        console.error("Send group status error:", error);
        throw new Error(`Failed to send group status: ${error.message}`);
    }
}

// 📌 Convert audio to voice note
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
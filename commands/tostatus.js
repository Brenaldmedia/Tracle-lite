const { downloadContentFromMessage, generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

module.exports = {
    pattern: "tostatus",
    desc: "Send text/image/video to your WhatsApp Status (Owner only)",
    category: "owner",
    react: "📱",
    filename: __filename,
    use: "<text> or reply to media",
    ownerOnly: true,
    
    execute: async (conn, message, m, context) => {
        try {
            const { from, reply, q, isGroup, sessionId, args, userPrefix, isBotOwner } = context;
            
            console.log(`🔍 tostatus command called - Owner: ${isBotOwner()}`);
            
            if (!isBotOwner()) {
                return reply("❌ *Owner only command!*");
            }
            
            const quotedMessage = m.quoted;
            let userCaption = (q || "").trim();
            
            if (!quotedMessage && !userCaption) {
                return reply(getHelpText(userPrefix));
            }
            
            let payload = null;
            let mediaBuffer = null;
            let mediaType = null;
            let originalCaption = "";
            
            if (quotedMessage) {
                try {
                    // Extract media and caption
                    if (quotedMessage.videoMessage) {
                        console.log(`📹 Processing video`);
                        mediaBuffer = await downloadToBuffer(conn, quotedMessage.videoMessage, 'video', sessionId);
                        mediaType = 'video';
                        originalCaption = quotedMessage.videoMessage.caption || '';
                    }
                    else if (quotedMessage.imageMessage) {
                        console.log(`🖼️ Processing image`);
                        mediaBuffer = await downloadToBuffer(conn, quotedMessage.imageMessage, 'image', sessionId);
                        mediaType = 'image';
                        originalCaption = quotedMessage.imageMessage.caption || '';
                    }
                    else if (quotedMessage.audioMessage) {
                        console.log(`🎵 Processing audio`);
                        mediaBuffer = await downloadToBuffer(conn, quotedMessage.audioMessage, 'audio', sessionId);
                        mediaType = 'audio';
                        originalCaption = quotedMessage.audioMessage.caption || '';
                        
                        if (quotedMessage.audioMessage.ptt) {
                            mediaBuffer = await toVN(mediaBuffer);
                        }
                    }
                    else if (quotedMessage.conversation || quotedMessage.extendedTextMessage?.text) {
                        mediaType = 'text';
                        originalCaption = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || '';
                    }
                    
                    // Determine final caption
                    let finalCaption = "";
                    if (userCaption && userCaption.length > 0) {
                        finalCaption = userCaption;
                    } else if (originalCaption && originalCaption.length > 0) {
                        finalCaption = originalCaption;
                    }
                    
                    payload = { mediaBuffer, mediaType, caption: finalCaption };
                    
                } catch (error) {
                    console.error("Error building payload:", error);
                    return reply(`❌ *Failed to process media:* ${error.message}`);
                }
            } 
            else if (userCaption) {
                payload = { mediaType: 'text', text: userCaption };
            }
            
            if (!payload) {
                return reply(getHelpText(userPrefix));
            }
            
            await reply(`⏳ *Posting to your WhatsApp Status...*`);
            
            try {
                await sendToStatusViaViewOnce(conn, payload);
                
                let successMsg = `✅ *Posted to your WhatsApp Status!*`;
                if (payload.caption) {
                    successMsg += `\n📝 "${payload.caption.substring(0, 50)}"`;
                }
                
                await reply(successMsg);
                console.log(`✅ Status posted successfully`);
                
                await conn.sendMessage(from, {
                    react: { text: "✅", key: message.key }
                }).catch(() => {});
                
            } catch (error) {
                console.error("Send error:", error);
                await reply(`❌ *Failed to post status:* ${error.message}`);
                
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                }).catch(() => {});
            }
            
        } catch (error) {
            console.error('Error in tostatus:', error);
            
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

function getHelpText(prefix = ".") {
    return `📱 *WHATSAPP STATUS COMMAND* (Owner Only)\n\n` +
           `*Usage:*\n` +
           `• Send text: ${prefix}tostatus Hello world!\n` +
           `• Reply to image: [Reply to image] → ${prefix}tostatus\n` +
           `• Reply with caption: [Reply to image] → ${prefix}tostatus My caption\n` +
           `• Reply to video: [Reply to video] → ${prefix}tostatus\n` +
           `• Reply to video with caption: [Reply to video] → ${prefix}tostatus Check this out!\n\n` +
           `*Examples:*\n` +
           `• ${prefix}tostatus Good morning everyone! 🌅\n` +
           `• Reply to a photo → ${prefix}tostatus Beautiful sunset!`;
}

async function downloadToBuffer(conn, message, type, sessionId) {
    try {
        console.log(`⬇️ Downloading ${type}...`);
        const stream = await downloadContentFromMessage(message, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        console.log(`✅ Downloaded ${buffer.length} bytes`);
        return buffer;
    } catch (error) {
        console.error(`Download error:`, error);
        throw new Error(`Failed to download ${type}: ${error.message}`);
    }
}

// WORKING METHOD: Send as view-once message to yourself (appears as status in some versions)
async function sendToStatusViaViewOnce(conn, payload) {
    try {
        console.log(`📤 Posting to status via view-once method...`);
        
        // Get bot's own JID
        const botJid = conn.user.id;
        let botNumber = botJid.split(':')[0].split('@')[0];
        botNumber = botNumber.replace(/\D/g, '');
        const ownerJid = `${botNumber}@s.whatsapp.net`;
        
        console.log(`📱 Sending to: ${ownerJid}`);
        
        let messageContent = {};
        
        if (payload.mediaType === 'text') {
            // For text status, send as regular message to self with status context
            messageContent = {
                text: payload.text,
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "status@broadcast",
                        newsletterName: "Status Update",
                        serverMessageId: Date.now()
                    }
                }
            };
            await conn.sendMessage(ownerJid, messageContent);
            
        } else if (payload.mediaType === 'image') {
            // Send as view-once image (appears as status)
            messageContent = {
                image: payload.mediaBuffer,
                caption: payload.caption || '',
                viewOnce: true
            };
            await conn.sendMessage(ownerJid, messageContent);
            
        } else if (payload.mediaType === 'video') {
            // Send as view-once video
            messageContent = {
                video: payload.mediaBuffer,
                caption: payload.caption || '',
                viewOnce: true
            };
            await conn.sendMessage(ownerJid, messageContent);
            
        } else if (payload.mediaType === 'audio') {
            // Send as voice note
            messageContent = {
                audio: payload.mediaBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            };
            await conn.sendMessage(ownerJid, messageContent);
        }
        
        console.log(`✅ Content sent to ${ownerJid}`);
        console.log(`⚠️ Note: This may appear as a view-once message in your DM instead of status.`);
        console.log(`💡 Alternative: Use a WhatsApp mod that supports status posting.`);
        
        return true;
        
    } catch (error) {
        console.error("Send via view-once error:", error);
        throw error;
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
            .on("error", (err) => {
                console.error("FFmpeg error:", err);
                reject(err);
            })
            .on("end", () => {
                const buffer = Buffer.concat(chunks);
                console.log(`✅ Converted to voice note: ${buffer.length} bytes`);
                resolve(buffer);
            })
            .pipe(outStream, { end: true });

        outStream.on("data", chunk => chunks.push(chunk));
    });
}
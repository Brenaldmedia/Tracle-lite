const { downloadContentFromMessage, generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

module.exports = {
    pattern: "tostatus",
    desc: "Owner: Send to personal WhatsApp status",
    category: "owner",
    react: "🌟",
    filename: __filename,
    use: "<reply to media/text>",
    ownerOnly: true, // Owner-only command
    
    execute: async (conn, message, m, { from, reply, q, sessionId }) => {
        try {
            // ✅ Check if user is owner
            const isOwner = global.isBotOwner(conn, message, sessionId);
            
            if (!isOwner) {
                console.log(`❌ Non-owner attempted to use tostatus: ${message.key.participant || message.key.remoteJid}`);
                // React with X emoji
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                }).catch(() => {});
                return; // Silently exit
            }

            const quotedMessage = m.quoted;
            
            // ✅ Show help if no content provided
            if (!quotedMessage && !q) {
                return reply(getHelpText());
            }

            // React with processing emoji
            await conn.sendMessage(from, {
                react: { text: "⏳", key: message.key }
            }).catch(() => {});

            await reply("🌟 *Processing for your status...*");
            
            let payload = null;
            let commandText = q || "";
            
            // ✅ Handle quoted message
            if (quotedMessage) {
                payload = await buildPayloadFromQuoted(conn, quotedMessage, sessionId);
                
                // ✅ Add caption from command text if provided
                if (commandText && payload) {
                    if (payload.video) {
                        payload.caption = commandText;
                    } else if (payload.image) {
                        payload.caption = commandText;
                    }
                }
            } 
            // ✅ Handle plain text command
            else if (commandText) {
                payload = { text: commandText };
            }

            if (!payload) {
                await reply(getHelpText());
                return;
            }

            try {
                // ✅ Send to personal status
                await sendToPersonalStatus(conn, payload);
                
                const mediaType = detectMediaType(quotedMessage, payload);
                let successMsg = `✅ *${mediaType} sent to your personal status!*\n\n`;
                
                if (payload.caption) {
                    successMsg += `📝 *Caption:* "${payload.caption}"\n\n`;
                }
                
                successMsg += `🌟 *Your contacts will see this in their status updates.*`;
                
                await reply(successMsg);
                
                // React with success emoji
                await conn.sendMessage(from, {
                    react: { text: "✅", key: message.key }
                }).catch(() => {});
                
            } catch (error) {
                console.error("Status send error:", error);
                await reply(`❌ *Failed to send to status:* ${error.message}\n\nMake sure you have status posting enabled in WhatsApp.`);
                
                // React with error emoji
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                }).catch(() => {});
            }

        } catch (error) {
            console.error('Error in tostatus command:', error);
            await reply(`❌ *Error:* ${error.message}`);
            
            // React with error emoji
            try {
                await conn.sendMessage(from, {
                    react: { text: "❌", key: message.key }
                });
            } catch (e) {}
        }
    }
};

/* ------------------ Helper Functions ------------------ */

// 📌 Help text for owner
function getHelpText() {
    return `🌟 *PERSONAL STATUS UPLOAD* (Owner Only)\n\n` +
           `*Usage:*\n` +
           `• Reply to any media (image/video) with .tostatus\n` +
           `• Add caption: .tostatus [your caption]\n` +
           `• Text only: .tostatus [your status text]\n\n` +
           `*Examples:*\n` +
           `• Reply to photo with: .tostatus\n` +
           `• With caption: .tostatus Check out my day! 🌞\n` +
           `• Text status: .tostatus Feeling great today! ✨\n\n` +
           `⚠️ *Note:* This goes to YOUR personal WhatsApp status, not group.`;
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
    if (!quotedMessage) return 'Text status';
    if (quotedMessage.videoMessage) return 'Video status';
    if (quotedMessage.imageMessage) return 'Image status';
    return 'Text status';
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

// 📌 Send to personal status (DIFFERENT from group status!)
async function sendToPersonalStatus(conn, content) {
    try {
        // For personal status, we use status@broadcast
        const statusJid = 'status@broadcast';
        
        if (content.text) {
            // Send text status
            await conn.sendMessage(statusJid, { text: content.text });
        } else if (content.image) {
            // Send image status
            await conn.sendMessage(statusJid, { 
                image: content.image,
                caption: content.caption || ''
            });
        } else if (content.video) {
            // Send video status
            await conn.sendMessage(statusJid, { 
                video: content.video,
                caption: content.caption || '',
                gifPlayback: content.gifPlayback || false
            });
        } else {
            throw new Error('Unsupported content type for status');
        }
        
        console.log('✅ Personal status sent successfully');
        
    } catch (error) {
        console.error("Send personal status error:", error);
        throw new Error(`Failed to update status: ${error.message}`);
    }
}
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// Main module export
module.exports = {
    pattern: "vv2",
    desc: "Owner only: Open view-once media and send to DM",
    category: "owner",
    react: "🕵️",
    filename: __filename,
    use: "<reply to a view-once media>",
    ownerOnly: true, // This makes it owner-only

    execute: async (conn, message, m, { from, reply, sender, sessionId, isBotOwner, context }) => {
        try {
            console.log(`🔍 vv2 command called by ${sender} in session ${sessionId}`);
            
            // Check if user is owner using context's isBotOwner or imported function
            let ownerCheck = false;
            
            if (context && typeof context.isBotOwner === 'function') {
                // Use context's isBotOwner function
                ownerCheck = context.isBotOwner();
                console.log(`📞 Using context.isBotOwner(): ${ownerCheck}`);
            } else if (typeof isBotOwner === 'function') {
                // Use passed isBotOwner function
                ownerCheck = isBotOwner(conn, message, sessionId);
                console.log(`📞 Using passed isBotOwner(): ${ownerCheck}`);
            } else {
                // Fallback to manual check
                console.log(`⚠️ isBotOwner function not available, using manual check`);
                
                // Extract session number
                const sessionNumber = sessionId.replace(/\D/g, '');
                console.log(`  • Session Number: ${sessionNumber}`);
                
                // Get sender JID and number
                const senderJid = message.key?.participant || message.key?.remoteJid;
                let senderNumber = '';
                if (senderJid) {
                    if (senderJid.includes('@lid')) {
                        senderNumber = senderJid.split('@')[0];
                    } else if (senderJid.includes('@s.whatsapp.net')) {
                        senderNumber = senderJid.split('@')[0];
                    } else if (senderJid.includes(':')) {
                        senderNumber = senderJid.split(':')[0];
                    } else {
                        senderNumber = senderJid;
                    }
                    senderNumber = senderNumber.replace(/\D/g, '');
                }
                console.log(`  • Sender Number: ${senderNumber}`);
                
                // Method 1: Check if message is from bot itself
                if (message.key && message.key.fromMe === true) {
                    ownerCheck = true;
                    console.log(`✅ OWNER CONFIRMED: Message is from bot itself`);
                }
                
                // Method 2: Check if sender is the session owner
                if (!ownerCheck && senderNumber && sessionNumber && senderNumber === sessionNumber) {
                    ownerCheck = true;
                    console.log(`✅ OWNER CONFIRMED: Sender ${senderNumber} is session owner ${sessionNumber}`);
                }
                
                // Method 3: Check global owner numbers from .env
                if (!ownerCheck && senderNumber) {
                    const ownerNumbers = process.env.OWNER_NUMBERS ? 
                        process.env.OWNER_NUMBERS.split(',').map(num => num.replace(/\D/g, '')) : 
                        [];
                    
                    for (const ownerNum of ownerNumbers) {
                        if (senderNumber.includes(ownerNum) || ownerNum.includes(senderNumber)) {
                            ownerCheck = true;
                            console.log(`✅ OWNER CONFIRMED: Sender ${senderNumber} matches owner number ${ownerNum}`);
                            break;
                        }
                    }
                }
            }
            
            if (!ownerCheck) {
                console.log(`❌ Non-owner attempted to use vv2: ${sender}`);
                // React with X emoji
                await conn.sendMessage(from, { 
                    react: { 
                        text: "❌", 
                        key: message.key 
                    } 
                }).catch(() => {});
                return; // Silently exit
            }

            console.log(`✅ Owner verified, proceeding with vv2 command...`);

            let quotedNode = null;

            if (m && m.quoted) {
                if (m.quoted.message && m.quoted.message.message) {
                    quotedNode = m.quoted.message.message;
                } else if (m.quoted.message) {
                    quotedNode = m.quoted.message;
                } else {
                    quotedNode = m.quoted;
                }
            } else if (message?.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                quotedNode = message.message.extendedTextMessage.contextInfo.quotedMessage;
            } else if (message?.quoted) {
                quotedNode = message.quoted;
            }

            if (!quotedNode) {
                // React with X emoji for error
                await conn.sendMessage(from, { 
                    react: { 
                        text: "❌", 
                        key: message.key 
                    } 
                }).catch(() => {});
                return;
            }

            let viewOnceWrapper =
                quotedNode.viewOnceMessage ||
                quotedNode.viewOnceMessageV2 ||
                (quotedNode.message && (quotedNode.message.viewOnceMessage || quotedNode.message.viewOnceMessageV2)) ||
                null;

            let innerPayload = null;
            if (viewOnceWrapper) innerPayload = viewOnceWrapper.message || viewOnceWrapper;
            else innerPayload = quotedNode.message || quotedNode;

            const innerNode =
                innerPayload.imageMessage ||
                innerPayload.videoMessage ||
                innerPayload.audioMessage ||
                innerPayload.stickerMessage ||
                innerPayload.documentMessage ||
                null;

            if (!innerNode) {
                // React with X emoji for error
                await conn.sendMessage(from, { 
                    react: { 
                        text: "❌", 
                        key: message.key 
                    } 
                }).catch(() => {});
                return;
            }

            let mediaType = null;
            if (innerPayload.imageMessage || innerNode?.mimetype?.startsWith?.("image")) mediaType = "image";
            else if (innerPayload.videoMessage || innerNode?.mimetype?.startsWith?.("video")) mediaType = "video";
            else if (innerPayload.audioMessage || innerNode?.mimetype?.startsWith?.("audio")) mediaType = "audio";
            else if (innerPayload.stickerMessage) mediaType = "sticker";
            else if (innerPayload.documentMessage) mediaType = "document";

            if (!mediaType) {
                // React with X emoji for error
                await conn.sendMessage(from, { 
                    react: { 
                        text: "❌", 
                        key: message.key 
                    } 
                }).catch(() => {});
                return;
            }

            // React with check mark emoji (start processing)
            await conn.sendMessage(from, { 
                react: { 
                    text: "🔍", 
                    key: message.key 
                } 
            }).catch(() => {});

            let buffer = null;

            try {
                if (m && m.quoted && typeof m.quoted.download === "function") {
                    buffer = await m.quoted.download();
                } else if (quotedNode && typeof quotedNode.download === "function") {
                    buffer = await quotedNode.download();
                }
            } catch (err) {
                console.error("Download error:", err?.message || err);
            }

            if (!buffer) {
                try {
                    const stream = await downloadContentFromMessage(innerNode, mediaType);
                    let tmp = Buffer.from([]);
                    for await (const chunk of stream) {
                        tmp = Buffer.concat([tmp, chunk]);
                    }
                    buffer = tmp;
                } catch (err) {
                    console.error("Download error:", err);
                    // React with X emoji for error
                    await conn.sendMessage(from, { 
                        react: { 
                            text: "❌", 
                            key: message.key 
                        } 
                    }).catch(() => {});
                    return;
                }
            }

            if (!buffer || buffer.length === 0) {
                // React with X emoji for error
                await conn.sendMessage(from, { 
                    react: { 
                        text: "❌", 
                        key: message.key 
                    } 
                }).catch(() => {});
                return;
            }

            // Get original caption if exists
            const originalCaption = innerNode.caption || "";
            
            // Get original sender info
            const originalSender = message.key.participant || message.key.remoteJid;
            let senderInfo = "Unknown";
            
            if (originalSender) {
                if (originalSender.includes('@g.us')) {
                    try {
                        const groupMetadata = await conn.groupMetadata(from);
                        const participant = groupMetadata.participants.find(p => p.id === originalSender);
                        senderInfo = participant?.id?.split('@')[0] || originalSender.split('@')[0];
                    } catch (err) {
                        senderInfo = originalSender.split('@')[0];
                    }
                } else {
                    senderInfo = originalSender.split('@')[0];
                }
            }

            // Get bot owner's JID (session owner)
            const botJid = conn.user?.id;
            let botNumber = '';
            if (botJid) {
                if (botJid.includes(':')) {
                    botNumber = botJid.split(':')[0];
                } else {
                    botNumber = botJid.split('@')[0];
                }
                botNumber = botNumber.replace(/\D/g, '');
            }
            
            const ownerJid = `${botNumber}@s.whatsapp.net`;

            // Prepare DM message with context info
            const dmCaption = `📩 *VIEW-ONCE MEDIA UNLOCKED*\n\n` +
                             `👤 *From:* ${senderInfo}\n` +
                             `👥 *Group:* ${from.includes('@g.us') ? 'Group Chat' : 'Private Chat'}\n` +
                             `📅 *Time:* ${new Date().toLocaleString()}\n` +
                             `${originalCaption ? `\n📝 *Caption:* ${originalCaption}` : ''}`;

            try {
                // Send media to owner's DM
                if (mediaType === "image") {
                    await conn.sendMessage(ownerJid, { 
                        image: buffer, 
                        caption: dmCaption
                    });
                } else if (mediaType === "video") {
                    await conn.sendMessage(ownerJid, { 
                        video: buffer, 
                        caption: dmCaption
                    });
                } else if (mediaType === "audio") {
                    await conn.sendMessage(ownerJid, { 
                        audio: buffer, 
                        mimetype: innerNode.mimetype || "audio/mp4", 
                        ptt: innerNode.ptt || false,
                        caption: dmCaption
                    });
                } else if (mediaType === "sticker") {
                    await conn.sendMessage(ownerJid, { 
                        sticker: buffer,
                        caption: dmCaption
                    });
                } else if (mediaType === "document") {
                    await conn.sendMessage(ownerJid, { 
                        document: buffer, 
                        fileName: innerNode.fileName || "unlocked-file",
                        caption: dmCaption
                    });
                } else {
                    // React with X emoji for unsupported type
                    await conn.sendMessage(from, { 
                        react: { 
                            text: "❌", 
                            key: message.key 
                        } 
                    }).catch(() => {});
                    return;
                }

                // React with check mark emoji for success
                await conn.sendMessage(from, { 
                    react: { 
                        text: "✅", 
                        key: message.key 
                    } 
                }).catch(() => {});

                console.log(`✅ vv2: Successfully sent ${mediaType} to owner's DM (${ownerJid})`);

            } catch (err) {
                console.error("❌ vv2: Error sending to DM:", err);
                // React with X emoji for error
                await conn.sendMessage(from, { 
                    react: { 
                        text: "❌", 
                        key: message.key 
                    } 
                }).catch(() => {});
            }

        } catch (err) {
            console.error("❌ vv2.js error:", err);
            try {
                // React with X emoji for any unhandled error
                await conn.sendMessage(from, { 
                    react: { 
                        text: "❌", 
                        key: message.key 
                    } 
                });
            } catch (e) {
                console.error("Failed to send react:", e);
            }
        }
    },
};
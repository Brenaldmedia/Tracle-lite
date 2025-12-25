const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// Helper function to auto-open view-once messages
async function autoOpenViewOnce(conn, message, sessionId) {
  try {
    const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
    
    // Get user settings using the global function from server.js
    let userSettings = { antivv: "off" };
    
    try {
      // Try to get from global scope first
      if (global.getUserSettings) {
        userSettings = global.getUserSettings(sessionId);
      } else {
        // Fallback: try to require server.js
        const server = require('../server');
        if (server.getUserSettings) {
          userSettings = server.getUserSettings(sessionId);
        }
      }
    } catch (err) {
      console.error("Error getting user settings:", err);
      return;
    }
    
    // Check if auto-open is enabled
    if (userSettings.antivv !== "on") {
      return; // Auto-open is disabled
    }
    
    const messageNode = message.message || message;
    if (!messageNode) return;
    
    // Check if it's a view-once message
    const viewOnceWrapper = 
      messageNode.viewOnceMessage ||
      messageNode.viewOnceMessageV2 ||
      null;
    
    if (!viewOnceWrapper) return;
    
    let innerPayload = viewOnceWrapper.message || viewOnceWrapper;
    const innerNode =
      innerPayload.imageMessage ||
      innerPayload.videoMessage ||
      innerPayload.audioMessage ||
      innerPayload.stickerMessage ||
      innerPayload.documentMessage ||
      null;
    
    if (!innerNode) return;
    
    // Determine media type
    let mediaType = null;
    if (innerPayload.imageMessage || innerNode?.mimetype?.startsWith?.("image")) mediaType = "image";
    else if (innerPayload.videoMessage || innerNode?.mimetype?.startsWith?.("video")) mediaType = "video";
    else if (innerPayload.audioMessage || innerNode?.mimetype?.startsWith?.("audio")) mediaType = "audio";
    else if (innerPayload.stickerMessage) mediaType = "sticker";
    else if (innerPayload.documentMessage) mediaType = "document";
    
    if (!mediaType) return;
    
    console.log(`🔄 Auto-opening view-once ${mediaType} for session ${sessionId}`);
    
    // Download the media
    let buffer = null;
    try {
      const stream = await downloadContentFromMessage(innerNode, mediaType);
      let tmp = Buffer.from([]);
      for await (const chunk of stream) {
        tmp = Buffer.concat([tmp, chunk]);
      }
      buffer = tmp;
    } catch (err) {
      console.error("Auto-open download error:", err);
      return;
    }
    
    if (!buffer || buffer.length === 0) return;
    
    // Get original caption
    const originalCaption = innerNode.caption || "";
    const from = message.key.remoteJid;
    
    // Send context info
    const contextInfo = {
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363401559573199@newsletter",
        newsletterName: "BrenaldMedia",
        serverMessageId: -1
      }
    };
    
    // Send the media automatically
    if (mediaType === "image") {
      await conn.sendMessage(from, { 
        image: buffer, 
        caption: originalCaption || "",
        contextInfo: contextInfo
      }, { quoted: message });
    } else if (mediaType === "video") {
      await conn.sendMessage(from, { 
        video: buffer, 
        caption: originalCaption || "",
        contextInfo: contextInfo
      }, { quoted: message });
    } else if (mediaType === "audio") {
      await conn.sendMessage(from, { 
        audio: buffer, 
        mimetype: innerNode.mimetype || "audio/mp4", 
        ptt: innerNode.ptt || false,
        contextInfo: contextInfo
      }, { quoted: message });
    } else if (mediaType === "sticker") {
      await conn.sendMessage(from, { 
        sticker: buffer,
        contextInfo: contextInfo
      }, { quoted: message });
    } else if (mediaType === "document") {
      await conn.sendMessage(from, { 
        document: buffer, 
        fileName: innerNode.fileName || "file",
        contextInfo: contextInfo
      }, { quoted: message });
    }
    
    console.log(`✅ Auto-opened view-once ${mediaType} for session ${sessionId}`);
    
  } catch (err) {
    console.error("Auto-open view-once error:", err);
  }
}

// Main module export
module.exports = {
  pattern: "vv",
  desc: "Open view-once image, video or audio",
  category: "utility",
  react: "🙉",
  filename: __filename,
  use: "<reply to a view-once media>",
  
  // Export the autoOpenViewOnce function so it can be called from server.js
  autoOpenViewOnce: autoOpenViewOnce,

  execute: async (conn, message, m, { from, reply, sender }) => {
    const sendMessageWithContext = async (text, quoted = message) => {
      return await conn.sendMessage(from, {
        text: text,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200
          }
        }
      }, { quoted: quoted });
    };

    try {
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
        return await sendMessageWithContext("🍁 Please reply to a *view-once* message with `.vv`.");
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
        return await sendMessageWithContext("❌ That's not a view-once media.");
      }

      let mediaType = null;
      if (innerPayload.imageMessage || innerNode?.mimetype?.startsWith?.("image")) mediaType = "image";
      else if (innerPayload.videoMessage || innerNode?.mimetype?.startsWith?.("video")) mediaType = "video";
      else if (innerPayload.audioMessage || innerNode?.mimetype?.startsWith?.("audio")) mediaType = "audio";
      else if (innerPayload.stickerMessage) mediaType = "sticker";
      else if (innerPayload.documentMessage) mediaType = "document";

      if (!mediaType) {
        return await sendMessageWithContext("❌ Unsupported media type in view-once message.");
      }

      if (module.exports.react) {
        try { await conn.sendMessage(from, { react: { text: module.exports.react, key: message.key } }); } catch(e) {}
      }

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
          return await sendMessageWithContext("❌ Failed to download the view-once media.");
        }
      }

      if (!buffer || buffer.length === 0) {
        return await sendMessageWithContext("❌ Downloaded view-once media is empty.");
      }

      // Get original caption if exists
      const originalCaption = innerNode.caption || "";

      const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363401559573199@newsletter",
          newsletterName: "BrenaldMedia",
          serverMessageId: -1
        }
      };

      // Send media with original caption (if image or video)
      if (mediaType === "image") {
        await conn.sendMessage(from, { 
          image: buffer, 
          caption: originalCaption || "",
          contextInfo: contextInfo
        }, { quoted: message });
      } else if (mediaType === "video") {
        await conn.sendMessage(from, { 
          video: buffer, 
          caption: originalCaption || "",
          contextInfo: contextInfo
        }, { quoted: message });
      } else if (mediaType === "audio") {
        await conn.sendMessage(from, { 
          audio: buffer, 
          mimetype: innerNode.mimetype || "audio/mp4", 
          ptt: innerNode.ptt || false,
          contextInfo: contextInfo
        }, { quoted: message });
      } else if (mediaType === "sticker") {
        await conn.sendMessage(from, { 
          sticker: buffer,
          contextInfo: contextInfo
        }, { quoted: message });
      } else if (mediaType === "document") {
        await conn.sendMessage(from, { 
          document: buffer, 
          fileName: innerNode.fileName || "file",
          contextInfo: contextInfo
        }, { quoted: message });
      } else {
        return await sendMessageWithContext("❌ Media type not supported.");
      }

    } catch (err) {
      console.error("vv.js error:", err);
      await sendMessageWithContext("❌ Failed to open view-once media.");
    }
  },
};
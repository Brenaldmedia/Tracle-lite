const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
  pattern: "vv",
  desc: "Open view-once image, video or audio",
  category: "utility",
  react: "🙉",
  filename: __filename,
  use: "<reply to a view-once media>",

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

      const contextInfo = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363401559573199@newsletter",
          newsletterName: "BrenaldMedia",
          serverMessageId: 200
        }
      };

      if (mediaType === "image") {
        await conn.sendMessage(from, { 
          image: buffer, 
          caption: "Opened view-once image",
          contextInfo: contextInfo
        }, { quoted: message });
      } else if (mediaType === "video") {
        await conn.sendMessage(from, { 
          video: buffer, 
          caption: "Opened view-once video",
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

      await sendMessageWithContext("✅ View-once media retrieved successfully!");

    } catch (err) {
      console.error("vv.js error:", err);
      await sendMessageWithContext("❌ Failed to open view-once media.");
    }
  },
};
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { videoToWebp, imageToWebp } = require('../lib/video-utils');
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const axios = require('axios');

module.exports = {
  pattern: "take",
  desc: "Convert media to sticker with optional custom author name",
  category: "sticker",
  react: "🔄",
  filename: __filename,
  use: "<reply to media> [author name]",

  execute: async (conn, message, m, { from, q, reply }) => {
    const sendText = async (text, quoted = message) => {
      return conn.sendMessage(from, { 
        text,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200
          }
        }
      }, { quoted });
    };

    try {
      // Use default names if no custom name provided
      const packName = "";
      const authorName = q ? q.trim() : "TRACLE - LITE";

      // Determine target message that contains media
      const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const target = quotedMsg || message.message;

      if (!target) {
        return await sendText("*Please reply to a sticker with take .*\n\n*Usage:* .take [author name]\n*Example:* .take Brenaldmedia");
      }

      // Detect media type
      let mediaNode = null;
      let mediaType = null;
      if (target.imageMessage) {
        mediaNode = target.imageMessage;
        mediaType = "image";
      } else if (target.videoMessage) {
        mediaNode = target.videoMessage;
        mediaType = "video";
      } else if (target.stickerMessage) {
        mediaNode = target.stickerMessage;
        mediaType = "sticker";
      } else {
        return await sendText("*Please reply to a  sticker.*\n\n*Usage:* .take  name");
      }

      // React if configured
      if (module.exports.react) {
        try { 
          await conn.sendMessage(from, { react: { text: module.exports.react, key: message.key } }); 
        } catch (e) {}
      }

      // Download media
      let buffer;
      try {
        const stream = await downloadContentFromMessage(mediaNode, mediaType);
        let _buf = Buffer.from([]);
        for await (const chunk of stream) {
          _buf = Buffer.concat([_buf, chunk]);
        }
        buffer = _buf;
      } catch (e) {
        console.error("Download error:", e);
        return await sendText("❌ Failed to download media. Try replying to a valid image/video/sticker.");
      }

      if (!buffer || buffer.length === 0) {
        return await sendText("❌ Downloaded media is empty or too large.");
      }

      // If sticker already, just re-send it with custom metadata
      if (mediaType === "sticker") {
        try {
          const sticker = new Sticker(buffer, {
            pack: packName,
            author: authorName,
            type: StickerTypes.FULL,
            quality: 75,
            background: "transparent",
          });
          const out = await sticker.toBuffer();
          return await conn.sendMessage(from, { sticker: out }, { quoted: message });
        } catch (e) {
          console.error("Sticker re-wrap error:", e);
          return await conn.sendMessage(from, { sticker: buffer }, { quoted: message });
        }
      }

      // Convert images/videos to webp
      let webpBuffer;
      try {
        if (mediaType === "image") {
          const convert = (typeof imageToWebp === "function") ? imageToWebp : videoToWebp;
          webpBuffer = await convert(buffer);
        } else {
          webpBuffer = await videoToWebp(buffer);
        }
      } catch (e) {
        console.error("Conversion error:", e);
        return await sendText("❌ Failed to convert media to sticker.");
      }

      if (!webpBuffer || webpBuffer.length === 0) {
        return await sendText("❌ Conversion produced empty output.");
      }

      // Create sticker with metadata
      try {
        const sticker = new Sticker(webpBuffer, {
          pack: packName,
          author: authorName,
          type: StickerTypes.FULL,
          quality: 75,
          background: "transparent",
        });
        const out = await sticker.toBuffer();
        await conn.sendMessage(from, { sticker: out }, { quoted: message });
        
      } catch (e) {
        console.error("Sticker formatter error:", e);
        await conn.sendMessage(from, { sticker: webpBuffer }, { quoted: message });
      }

    } catch (err) {
      console.error("Sticker execution error:", err);
      await sendText("❌ Sticker conversion failed.");
    }
  }
};
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { videoToWebp, imageToWebp } = require('../lib/video-utils');
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  pattern: "s",
  alias: ["sticker", "stiker", "stick"],
  desc: "Convert images, videos, and stickers with custom author name",
  category: "sticker",
  react: "🔄",
  filename: __filename,
  use: "<reply to media> [author name]",

  execute: async (conn, message, m, { from, q, reply, sessionId }) => {
    try {
      // Use default names if no custom name provided
      const packName = "TRACLE";
      const authorName = q ? q.trim() : "TRACLE - LITE";

      // Determine target message that contains media
      const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const target = quotedMsg || message.message;

      if (!target) {
        return await reply(
`🔄 *Sticker Maker*

❌ Please reply to an image, video, GIF, or sticker.

📌 *Usage:*
• Reply to media with: .s
• Add custom author: .s YourName

✨ *Supported Media:*
• Images (JPG, PNG, etc.)
• Videos (MP4, MOV, etc.) 
• GIFs
• Stickers (with custom author)`
        );
      }

      // Detect media type
      let mediaNode = null;
      let mediaType = null;
      let mediaInfo = "";
      
      if (target.imageMessage) {
        mediaNode = target.imageMessage;
        mediaType = "image";
        mediaInfo = "🖼️ Image";
      } else if (target.videoMessage) {
        mediaNode = target.videoMessage;
        mediaType = "video";
        mediaInfo = "🎥 Video";
      } else if (target.stickerMessage) {
        mediaNode = target.stickerMessage;
        mediaType = "sticker";
        mediaInfo = "😊 Sticker";
      } else if (target.documentMessage) {
        // Check if document is an image or video
        const mimeType = target.documentMessage.mimetype || '';
        if (mimeType.startsWith('image/')) {
          mediaNode = target.documentMessage;
          mediaType = "image";
          mediaInfo = "📄 Image Document";
        } else if (mimeType.startsWith('video/')) {
          mediaNode = target.documentMessage;
          mediaType = "video";
          mediaInfo = "📹 Video Document";
        } else {
          return await reply("❌ Unsupported document type. Please use images or videos.");
        }
      } else {
        return await reply("❌ No media found. Please reply to an image, video, or sticker.");
      }

      // React if configured
      if (module.exports.react) {
        try { 
          await conn.sendMessage(from, { react: { text: module.exports.react, key: message.key } }); 
        } catch (e) {}
      }

      await reply(`🔄 Converting ${mediaInfo} to sticker...`);

      // Download media
      let buffer;
      try {
        const stream = await downloadContentFromMessage(mediaNode, mediaType === "sticker" ? "sticker" : mediaType);
        let _buf = Buffer.from([]);
        for await (const chunk of stream) {
          _buf = Buffer.concat([_buf, chunk]);
        }
        buffer = _buf;
        
        if (!buffer || buffer.length === 0) {
          return await reply("❌ Downloaded media is empty. Please try again.");
        }
        
        console.log(`✅ Downloaded ${mediaType}: ${buffer.length} bytes`);
        
      } catch (e) {
        console.error("Download error:", e);
        return await reply("❌ Failed to download media. Please try again with a different file.");
      }

      // Handle file size limits
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      if (buffer.length > maxSize) {
        return await reply(`❌ File too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
      }

      // If sticker already, just re-send it with custom metadata
      if (mediaType === "sticker") {
        try {
          const sticker = new Sticker(buffer, {
            pack: packName,
            author: authorName,
            type: StickerTypes.FULL,
            quality: 50,
            background: "transparent",
          });
          const out = await sticker.toBuffer();
          
          await reply("✅ Sticker converted with new author!");
          await conn.sendMessage(from, { sticker: out }, { quoted: message });
          return;
          
        } catch (e) {
          console.error("Sticker re-wrap error:", e);
          // Fallback: send original sticker
          await reply("✅ Sending original sticker...");
          await conn.sendMessage(from, { sticker: buffer }, { quoted: message });
          return;
        }
      }

      // Convert images/videos to webp
      let webpBuffer;
      try {
        if (mediaType === "image") {
          console.log("Converting image to webp...");
          
          // Try different conversion methods
          if (typeof imageToWebp === "function") {
            webpBuffer = await imageToWebp(buffer);
          } else if (typeof videoToWebp === "function") {
            // Fallback to video conversion for images
            webpBuffer = await videoToWebp(buffer);
          } else {
            // Manual conversion using sharp if available
            try {
              const sharp = require('sharp');
              webpBuffer = await sharp(buffer)
                .resize(512, 512, { 
                  fit: 'inside', 
                  withoutEnlargement: true 
                })
                .webp({ quality: 80 })
                .toBuffer();
            } catch (sharpError) {
              throw new Error("No image conversion method available");
            }
          }
          
        } else if (mediaType === "video") {
          console.log("Converting video to webp...");
          
          if (typeof videoToWebp === "function") {
            webpBuffer = await videoToWebp(buffer);
          } else {
            // Fallback for video conversion
            try {
              // Simple frame extraction for GIF-like stickers
              const { GifReader } = require('omggif');
              // Create a simple animated sticker from first frame
              const sharp = require('sharp');
              webpBuffer = await sharp(buffer)
                .resize(512, 512, { 
                  fit: 'inside', 
                  withoutEnlargement: true 
                })
                .webp({ quality: 80 })
                .toBuffer();
            } catch (videoError) {
              throw new Error("No video conversion method available");
            }
          }
        }

        if (!webpBuffer || webpBuffer.length === 0) {
          throw new Error("Conversion produced empty output");
        }
        
        console.log(`✅ Converted to webp: ${webpBuffer.length} bytes`);
        
      } catch (e) {
        console.error("Conversion error:", e);
        return await reply("❌ Failed to convert media to sticker format. Please try a different image or video.");
      }

      // Create sticker with metadata
      try {
        const sticker = new Sticker(webpBuffer, {
          pack: packName,
          author: authorName,
          type: StickerTypes.FULL,
          quality: 50,
          background: "transparent",
        });
        
        const out = await sticker.toBuffer();
        
        await reply("✅ Sticker created successfully! 🎉");
        await conn.sendMessage(from, { sticker: out }, { quoted: message });
        
      } catch (e) {
        console.error("Sticker formatter error:", e);
        // Fallback: send raw webp as sticker
        await reply("✅ Sending converted sticker...");
        await conn.sendMessage(from, { sticker: webpBuffer }, { quoted: message });
      }

    } catch (err) {
      console.error("Sticker execution error:", err);
      await reply("❌ Sticker conversion failed. Please try again with a different file.");
    }
  }
};
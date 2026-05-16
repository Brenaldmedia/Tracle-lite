const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { webpToImage, webpToVideo } = require('../lib/video-utils');

// Helper function to download with timeout and retry
async function downloadWithTimeout(downloadFn, timeoutMs = 30000, retries = 2) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await Promise.race([
                downloadFn(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Download timeout after ${timeoutMs}ms`)), timeoutMs)
                )
            ]);
            return result;
        } catch (err) {
            lastError = err;
            console.log(`Download attempt ${attempt}/${retries} failed:`, err.message);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
    }
    throw lastError;
}

module.exports = {
  pattern: "toimg",
  alias: ["toimage", "sticker2img", "s2i"],
  desc: "Convert stickers to images",
  category: "media",
  react: "🖼️",
  filename: __filename,
  use: ".toimg (reply to sticker)",

  execute: async (conn, message, m, { from, reply, sessionId }) => {
    try {
      // Show usage if no quoted message
      const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMsg) {
        return await reply(
`🖼️ *Sticker to Image Converter*

📌 *How to use:*
1. Reply to any sticker with:
   .toimg

✨ *Features:*
• Converts stickers to high-quality PNG images
• Works with both static and animated stickers
• Fast conversion

💡 *Tip:* Use .tovid for animated stickers to video`
        );
      }

      // Check if it's a sticker
      if (!quotedMsg.stickerMessage) {
        return await reply(
`❌ That's not a sticker!

📌 *How to use .toimg:*
1. Find a sticker you want to convert
2. Reply to it with: .toimg
3. Get the PNG image back

💡 Works with all sticker types`
        );
      }

      const mediaNode = quotedMsg.stickerMessage;
      const isAnimated = mediaNode.isAnimated || false;
      
      // Send ⏳ reaction
      try { 
        await conn.sendMessage(from, { react: { text: "⏳", key: message.key } }); 
      } catch (e) {}

      await reply(`🖼️ Converting ${isAnimated ? 'animated ' : ''}sticker to image...`);

      // Download sticker with timeout and retry
      let stickerBuffer;
      try {
        const downloadStream = async () => {
          const stream = await downloadContentFromMessage(mediaNode, "sticker");
          let _buf = Buffer.from([]);
          for await (const chunk of stream) {
            _buf = Buffer.concat([_buf, chunk]);
          }
          return _buf;
        };
        
        stickerBuffer = await downloadWithTimeout(downloadStream, 30000, 3);
        
        if (!stickerBuffer || stickerBuffer.length === 0) {
          // Send ❌ reaction on failure
          try { 
            await conn.sendMessage(from, { react: { text: "❌", key: message.key } }); 
          } catch (e) {}
          return await reply("❌ Failed to download sticker. Please try again.");
        }
        
        console.log(`✅ Downloaded sticker: ${stickerBuffer.length} bytes`);
        
      } catch (e) {
        console.error("Sticker download error:", e);
        // Send ❌ reaction on failure
        try { 
          await conn.sendMessage(from, { react: { text: "❌", key: message.key } }); 
        } catch (err) {}
        return await reply("❌ Network timeout. Please try again in a few moments.");
      }

      let resultBuffer;
      let caption;

      try {
        // Try using webpToImage from video-utils first
        if (typeof webpToImage === "function") {
          resultBuffer = await webpToImage(stickerBuffer);
          console.log("✅ Used webpToImage from video-utils");
        } else {
          // Fallback to sharp
          const sharp = require('sharp');
          
          if (isAnimated) {
            // For animated stickers, extract first frame
            resultBuffer = await sharp(stickerBuffer, { pages: -1 })
              .png({ quality: 95 })
              .toBuffer();
          } else {
            // For static stickers, direct conversion
            resultBuffer = await sharp(stickerBuffer)
              .png({ quality: 95 })
              .toBuffer();
          }
          console.log("✅ Used sharp fallback");
        }

        if (!resultBuffer || resultBuffer.length === 0) {
          throw new Error("Conversion produced empty output");
        }
        
        caption = `🖼️ *Sticker to Image*\n\n✅ Converted ${isAnimated ? 'animated ' : ''}sticker to PNG\n✨ Use .toimg on any sticker`;
        
        console.log(`✅ Converted to image: ${resultBuffer.length} bytes`);
        
      } catch (e) {
        console.error("Image conversion error:", e);
        // Send ❌ reaction on failure
        try { 
          await conn.sendMessage(from, { react: { text: "❌", key: message.key } }); 
        } catch (err) {}
        return await reply("❌ Failed to convert sticker to image. Please try again.");
      }

      // Send the converted image
      try {
        await conn.sendMessage(from, {
          image: resultBuffer,
          mimetype: 'image/png',
          caption: caption
        }, { quoted: message });
        
        console.log("✅ Image sent successfully");
        
      } catch (sendError) {
        console.error("Send error:", sendError);
        await reply("❌ Failed to send image. The file might be too large.");
      }

    } catch (err) {
      console.error("Sticker to image conversion error:", err);
      // Send ❌ reaction on failure
      try { 
        await conn.sendMessage(from, { react: { text: "❌", key: message.key } }); 
      } catch (e) {}
      await reply("❌ Conversion failed. Please try again with a different sticker.");
    }
  }
};
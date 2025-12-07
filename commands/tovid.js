const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { webpToImage, webpToVideo } = require('../lib/video-utils');
const fs = require('fs');
const path = require('path');

module.exports = {
  pattern: "tovid",
  alias: ["tovideo", "sticker2vid", "s2v"],
  desc: "Convert animated stickers to videos",
  category: "media",
  react: "🎥",
  filename: __filename,
  use: ".tovid (reply to animated sticker)",

  execute: async (conn, message, m, { from, reply, sessionId }) => {
    try {
      // Show usage if no quoted message
      const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMsg) {
        return await reply(
`🎥 *Sticker to Video Converter*

📌 *How to use:*
1. Reply to an ANIMATED sticker with:
   .tovid

✨ *Features:*
• Converts animated stickers to MP4 videos
• Preserves animation and quality

⚠️ *Note:* Only works with animated stickers
💡 Use .toimg for static stickers`
        );
      }

      // Check if it's a sticker
      if (!quotedMsg.stickerMessage) {
        return await reply(
`❌ That's not a sticker!

📌 *How to use .tovid:*
1. Find an ANIMATED sticker
2. Reply to it with: .tovid  
3. Get the MP4 video back

💡 Only works with animated stickers`
        );
      }

      const mediaNode = quotedMsg.stickerMessage;
      const isAnimated = mediaNode.isAnimated || false;
      
      // Check if it's animated
      if (!isAnimated) {
        return await reply(
`❌ This is a static sticker!

📌 *For static stickers:*
Use .toimg instead to convert to image

🎥 *For animated stickers:*
Use .tovid to convert to video

💡 This sticker doesn't have animation`
        );
      }

      // React
      if (module.exports.react) {
        try { 
          await conn.sendMessage(from, { react: { text: module.exports.react, key: message.key } }); 
        } catch (e) {}
      }

      await reply("🎥 Converting animated sticker to video...");

      // Download sticker
      let stickerBuffer;
      try {
        const stream = await downloadContentFromMessage(mediaNode, "sticker");
        let _buf = Buffer.from([]);
        for await (const chunk of stream) {
          _buf = Buffer.concat([_buf, chunk]);
        }
        stickerBuffer = _buf;
        
        if (!stickerBuffer || stickerBuffer.length === 0) {
          return await reply("❌ Failed to download sticker. Please try again.");
        }
        
        console.log(`✅ Downloaded animated sticker: ${stickerBuffer.length} bytes`);
        
      } catch (e) {
        console.error("Sticker download error:", e);
        return await reply("❌ Failed to download sticker. Please try again.");
      }

      let resultBuffer;
      let caption;

      try {
        // Try using webpToVideo from video-utils first
        if (typeof webpToVideo === "function") {
          resultBuffer = await webpToVideo(stickerBuffer);
          console.log("✅ Used webpToVideo from video-utils");
        } else {
          // Fallback to ffmpeg
          resultBuffer = await convertAnimatedWebpToVideo(stickerBuffer);
          console.log("✅ Used ffmpeg fallback");
        }

        if (!resultBuffer || resultBuffer.length === 0) {
          throw new Error("Video conversion produced empty output");
        }
        
        caption = `🎥 *Sticker to Video*\n\n✅ Converted animated sticker to MP4\n✨ Animation preserved in video format`;
        
        console.log(`✅ Converted to video: ${resultBuffer.length} bytes`);
        
      } catch (e) {
        console.error("Video conversion error:", e);
        
        // Fallback: Convert to image if video fails
        try {
          // Try webpToImage first, then sharp
          if (typeof webpToImage === "function") {
            resultBuffer = await webpToImage(stickerBuffer);
          } else {
            const sharp = require('sharp');
            resultBuffer = await sharp(stickerBuffer, { pages: -1 })
              .png({ quality: 95 })
              .toBuffer();
          }
          
          caption = `🖼️ *Fallback: Sticker to Image*\n\n✅ Video conversion failed\n✨ Converted to image instead\n💡 Use .toimg for better image results`;
          
          // Send as image instead
          await conn.sendMessage(from, {
            image: resultBuffer,
            mimetype: 'image/png',
            caption: caption
          }, { quoted: message });
          
          return await reply("⚠️ Video conversion failed, sent as image instead");
          
        } catch (fallbackError) {
          return await reply("❌ Failed to convert animated sticker. Please try .toimg instead.");
        }
      }

      // Send the converted video
      try {
        await conn.sendMessage(from, {
          video: resultBuffer,
          mimetype: 'video/mp4',
          caption: caption
        }, { quoted: message });
        
        console.log("✅ Video sent successfully");
        
      } catch (sendError) {
        console.error("Send error:", sendError);
        await reply("❌ Failed to send video. The file might be too large.");
      }

    } catch (err) {
      console.error("Sticker to video conversion error:", err);
      await reply("❌ Conversion failed. Please try again with a different animated sticker.");
    }
  }
};

// Function to convert animated WebP to video using ffmpeg (fallback)
async function convertAnimatedWebpToVideo(webpBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      const { spawn } = require('child_process');
      const { tmpdir } = require('os');
      const tmpPath = path.join(tmpdir(), `animated_sticker_${Date.now()}`);
      
      // Write webp to temp file
      fs.writeFileSync(`${tmpPath}.webp`, webpBuffer);
      const outputFile = `${tmpPath}.mp4`;
      
      console.log("Converting animated WebP to MP4 using ffmpeg...");
      
      // Use ffmpeg to convert animated WebP to MP4
      const ffmpeg = spawn('ffmpeg', [
        '-i', `${tmpPath}.webp`,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-movflags', 'faststart',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-y', outputFile
      ], { stdio: 'pipe' });
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        // Cleanup temp files
        try { fs.unlinkSync(`${tmpPath}.webp`); } catch {}
        
        if (code === 0 && fs.existsSync(outputFile)) {
          const result = fs.readFileSync(outputFile);
          try { fs.unlinkSync(outputFile); } catch {}
          resolve(result);
        } else {
          console.error('FFmpeg error:', stderr);
          reject(new Error(`FFmpeg conversion failed with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        // Cleanup on error
        try { fs.unlinkSync(`${tmpPath}.webp`); } catch {}
        reject(new Error(`FFmpeg not available: ${error.message}`));
      });
      
      // Timeout after 15 seconds
      setTimeout(() => {
        try {
          ffmpeg.kill();
          fs.unlinkSync(`${tmpPath}.webp`);
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        } catch {}
        reject(new Error("FFmpeg conversion timeout"));
      }, 15000);
      
    } catch (error) {
      reject(new Error(`FFmpeg conversion error: ${error.message}`));
    }
  });
}
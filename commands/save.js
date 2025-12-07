const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
  pattern: "save",
  desc: "Forwards quoted message back to user",
  react: "📤",
  category: "utility",
  filename: __filename,
  use: ".save [reply to media message]",

  execute: async (conn, message, m, { from }) => {
    const sendMessageWithContext = async (text, quoted = message) => {
      return conn.sendMessage(
        from,
        {
          text,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363401559573199@newsletter",
              newsletterName: "BrenaldMedia",
              serverMessageId: 200,
            },
          },
        },
        { quoted }
      );
    };

    try {
      // 1) Check if there's a quoted message
      const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg) {
        return await sendMessageWithContext(
          "❌ Please reply to a media message with `.save`"
        );
      }

      // 2) React
      if (module.exports.react) {
        try {
          await conn.sendMessage(from, {
            react: { text: module.exports.react, key: message.key },
          });
        } catch {}
      }

      // 3) Detect media type & node
      let mediaNode = null;
      let mediaType = null;
      if (quotedMsg.imageMessage) {
        mediaNode = quotedMsg.imageMessage;
        mediaType = "image";
      } else if (quotedMsg.videoMessage) {
        mediaNode = quotedMsg.videoMessage;
        mediaType = "video";
      } else if (quotedMsg.audioMessage) {
        mediaNode = quotedMsg.audioMessage;
        mediaType = "audio";
      } else if (quotedMsg.documentMessage) {
        mediaNode = quotedMsg.documentMessage;
        mediaType = "document";
      } else {
        return await sendMessageWithContext(
          "❌ Only image, video, audio, and document messages are supported"
        );
      }

      // 4) Download media
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
        return await sendMessageWithContext(
          "❌ Failed to download media. Try replying to a valid file."
        );
      }

      if (!buffer || buffer.length === 0) {
        return await sendMessageWithContext(
          "❌ Downloaded media is empty or too large."
        );
      }

      // 5) Prepare message content based on media type
      let messageContent = {};
      const caption = quotedMsg.caption || "";

      switch (mediaType) {
        case "image":
          messageContent = {
            image: buffer,
            caption: caption || "📸 Saved Image",
            mimetype: mediaNode.mimetype || "image/jpeg"
          };
          break;
        case "video":
          messageContent = {
            video: buffer,
            caption: caption || "🎥 Saved Video",
            mimetype: mediaNode.mimetype || "video/mp4"
          };
          break;
        case "audio":
          messageContent = {
            audio: buffer,
            mimetype: mediaNode.mimetype || "audio/mp4",
            ptt: mediaNode.ptt || false
          };
          break;
        case "document":
          messageContent = {
            document: buffer,
            fileName: mediaNode.fileName || "document",
            mimetype: mediaNode.mimetype || "application/octet-stream"
          };
          break;
      }

      // 6) Send the media back to user
      await conn.sendMessage(from, messageContent, { quoted: message });

      // 7) Send confirmation message
      await sendMessageWithContext(
        `✅ Media saved successfully!\n` +
        `📁 Type: ${mediaType.toUpperCase()}\n` +
        `💾 Size: ${formatBytes(buffer.length)}\n\n` +
        `> © Saved by *TRACLE - LITE* 💜`
      );

    } catch (err) {
      console.error("Save execution error:", err);
      await sendMessageWithContext(
        `⚠️ Error: ${err.message || "Failed to save media"}`
      );
    }
  },
};

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
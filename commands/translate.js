const translate = require("@iamtraction/google-translate");
const axios = require("axios");

// List of supported language codes
const validLangs = [
  "en","fr","es","de","pt","ru","ar","zh","ja",
  "it","hi","tr","ko","nl","pl","sv","cs","id",
  "fa","uk"
];

// Helper to extract text from quoted message
function extractText(quoted) {
  if (!quoted) return null;
  return (
    quoted.conversation ||
    quoted.extendedTextMessage?.text ||
    quoted.imageMessage?.caption ||
    quoted.videoMessage?.caption ||
    null
  );
}

module.exports = {
  pattern: "trt",
  desc: "Translate text or replied message to a specified language (default: English).",
  react: "🌐",
  category: "tools",
  filename: __filename,

  execute: async (conn, mek, m, { from, reply }) => {
    // Helper function to send messages with contextInfo
    const sendMessageWithContext = async (text, quoted = mek) => {
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
      // React 🌐
      if (module.exports.react) {
        await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
      }

      // Extract raw command text
      const rawText = mek.message?.conversation || mek.message?.extendedTextMessage?.text || "";
      const parts = rawText.trim().split(" ").slice(1); // remove command

      let targetLang = "en"; // default
      let textToTranslate = null;

      // --- Case 1: Reply to a message ---
      if (mek.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMsg = mek.message.extendedTextMessage.contextInfo.quotedMessage;
        textToTranslate = extractText(quotedMsg);

        if (!textToTranslate) {
          return await sendMessageWithContext("❌ No text found in the replied message to translate.");
        }

        if (parts.length > 0 && validLangs.includes(parts[0].toLowerCase())) {
          targetLang = parts[0].toLowerCase();
        }
      }

      // --- Case 2: User typed language + text ---
      else if (parts.length >= 2 && validLangs.includes(parts[0].toLowerCase())) {
        targetLang = parts[0].toLowerCase();
        textToTranslate = parts.slice(1).join(" ");
      }

      // --- Case 3: User typed only text ---
      else if (parts.length >= 1) {
        textToTranslate = parts.join(" ");
      }

      // Validate
      if (!textToTranslate) {
        return await sendMessageWithContext(
          "❌ Usage:\n- `.trt <text>` (to English)\n- `.trt <lang> <text>`\n- Reply to a message with `.trt [lang]`"
        );
      }

      // Translate
      let translated = "";
      try {
        const res = await translate(textToTranslate, { to: targetLang });
        translated = res.text;
      } catch {
        // Fallback using Google API directly if @iamtraction fails
        const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
        const googleRes = await axios.get(googleUrl, { timeout: 8000 });
        translated = googleRes.data[0].map(item => item[0]).join("");
      }

      const message = `🌐 *Translated to ${targetLang.toUpperCase()}:*\n\n${translated}`;
      await sendMessageWithContext(message);

    } catch (error) {
      console.error("❌ Error in translate command:", error);
      await sendMessageWithContext("⚠️ An error occurred while translating. Please try again.");
    }
  }
};
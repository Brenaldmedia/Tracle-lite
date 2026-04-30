// === secretvv.js - Set custom emoji trigger for view-once catcher (REPLY METHOD) ===
const fs = require('fs-extra');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// File to store emoji triggers per session
const secretVVPath = path.join(__dirname, '..', 'data', 'secretvv.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load secretVV settings
function loadSecretVVSettings() {
    try {
        if (fs.existsSync(secretVVPath)) {
            return JSON.parse(fs.readFileSync(secretVVPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading secretVV settings:', error);
    }
    return {};
}

// Save secretVV settings
function saveSecretVVSettings(settings) {
    try {
        fs.writeFileSync(secretVVPath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving secretVV settings:', error);
        return false;
    }
}

// Get user's trigger emoji
function getUserTrigger(sessionId) {
    const settings = loadSecretVVSettings();
    return settings[sessionId] || '🎩';
}

// Set user's trigger emoji
function setUserTrigger(sessionId, emoji) {
    const settings = loadSecretVVSettings();
    settings[sessionId] = emoji;
    return saveSecretVVSettings(settings);
}

module.exports = {
    pattern: "secretvv",
    alias: ["settrigger", "vvtrigger", "catch"],
    desc: "Set custom emoji trigger for view-once media catcher",
    category: "owner",
    react: "🎩",
    filename: __filename,
    use: ".secretvv <emoji>",
    ownerOnly: true,

    execute: async (conn, message, m, { from, reply, args, sessionId }) => {
        try {
            const currentTrigger = getUserTrigger(sessionId);
            
            if (!args[0]) {
                await reply(`🎩 *Secret View-Once Catcher*

Current trigger emoji: *${currentTrigger}*

📝 *Usage:*
.secretvv <emoji>

📌 *Examples:*
.secretvv 🔥
.secretvv 😂
.secretvv 👀
.secretvv 💀

💡 *How it works:*
Reply to ANY view-once message with your chosen emoji (just the emoji, no prefix) and the bot will secretly capture it and send to your DM.

Example: Reply to a view-once message with 🔥

Current trigger: ${currentTrigger}

> ⚡ Powered by Tracle-Lite`);
                return;
            }

            const newTrigger = args[0];
            
            // Validate emoji (basic check)
            const emojiRegex = /[\p{Emoji}]/u;
            if (!emojiRegex.test(newTrigger)) {
                await reply(`❌ Invalid emoji. Please use a valid emoji like: 🎩 🔥 😂 👀 💀\n\n> ⚡ Powered by Tracle-Lite`);
                return;
            }

            // Save the new trigger
            setUserTrigger(sessionId, newTrigger);
            
            await reply(`✅ *Trigger emoji updated!*\n\nOld: ${currentTrigger}\nNew: ${newTrigger}\n\nWhen you reply to a view-once media with ${newTrigger}, it will be sent to your DM.\n\n> ⚡ Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "✅", key: message.key } });

        } catch (error) {
            console.error("SecretVV error:", error);
            await reply(`❌ Error: ${error.message}\n\n> ⚡ Powered by Tracle-Lite`);
        }
    }
};
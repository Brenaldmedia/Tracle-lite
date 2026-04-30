module.exports = {
    pattern: "autolike",
    alias: ["likestatus", "autolikestatus"],
    desc: "Toggle auto-like status feature with 50+ custom emojis",
    category: "owner",
    react: "❤️",
    filename: __filename,
    use: ".autolike [on/off/emojis/set/list]",
    ownerOnly: true,

    execute: async (conn, message, m, { from, reply, args, sessionId, userSettings, userPrefix, sendMessageWithContext, MENU_IMAGE_URL, REPO_LINK, updateUserSettings }) => {
        try {
            const currentStatus = userSettings.autoLikeStatus || "false";
            
            // EXTENDED EMOJI LIST - 50+ beautiful emojis
            const defaultEmojis = [
                '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💗', '💓', '💖', '💘', '💝', '💞',
                '🔥', '⭐', '✨', '🌟', '💫', '⚡', '🎯', '💪', '🏆', '🎉', '🎊', '🥇', '👑',
                '😍', '🥰', '😘', '😊', '🙂', '😎', '🤩', '🥳', '😁', '😂', '🤣', '😭', '🥹',
                '💎', '👀', '🙌', '👏', '👍', '💯', '🔱', '🦅', '🌹', '🌸', '🌺', '🍂', '🍁',
                '🎈', '🎀', '🪄', '🔮', '💠', '🌀', '🌈', '☀️', '🌙', '💥', '🕊️', '🦋', '🐉'
            ];
            
            if (!args[0]) {
                const statusText = currentStatus === "true" ? '✅ ON' : '❌ OFF';
                const currentEmojis = userSettings.autoLikeEmojis || defaultEmojis;
                const singleEmoji = userSettings.autoLikeSingleEmoji || "false";
                
                const emojiPreview = Array.isArray(currentEmojis) ? currentEmojis.slice(0, 10).join(' ') + (currentEmojis.length > 10 ? `\n... and ${currentEmojis.length - 10} more` : '') : '❤️ 🔥 💎';
                
                const text = `❤️ *Auto-Like Status Settings* ❤️

┌─────────────────────────────┐
│ Status: ${statusText}                  │
│ Emoji Pool: ${currentEmojis.length} emojis  │
│ ${singleEmoji !== "false" ? `Mode: SINGLE (${singleEmoji})` : 'Mode: RANDOM'}     │
└─────────────────────────────┘

📋 *Emoji Preview:*
${emojiPreview}

📝 *Commands:*
• ${userPrefix}autolike on - Enable auto-like
• ${userPrefix}autolike off - Disable auto-like
• ${userPrefix}autolike emojis ❤️ 🔥 👀 - Set custom emoji pool
• ${userPrefix}autolike set ❤️ - Use single emoji only
• ${userPrefix}autolike random - Use random emojis mode
• ${userPrefix}autolike list - Show all emojis
• ${userPrefix}autolike reset - Reset to default emojis

💡 Bot will react to status updates with random emojis

> ❤️ *${currentEmojis.length} emojis ready* | Powered by Tracle-Lite`;

                return await sendMessageWithContext(conn, from, text, {
                    quoted: message,
                    externalAdReply: {
                        title: "Auto-Like Settings",
                        body: `Status: ${currentStatus === "true" ? 'ON' : 'OFF'} | ${currentEmojis.length} emojis`,
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                });
            }
            
            if (args[0] === 'on') {
                if (currentStatus === "true") {
                    return await reply(`❌ Auto-like is already ON`);
                }
                updateUserSettings({ autoLikeStatus: "true" });
                return await reply(`✅ *Auto-like ENABLED*\n\nBot will now react to status updates with random emojis from your pool.\n\nUse ${userPrefix}autolike emojis to customize!`);
            }
            
            if (args[0] === 'off') {
                if (currentStatus === "false") {
                    return await reply(`❌ Auto-like is already OFF`);
                }
                updateUserSettings({ autoLikeStatus: "false" });
                return await reply(`❌ *Auto-like DISABLED*\n\nBot will NOT react to status updates.`);
            }
            
            if (args[0] === 'random') {
                updateUserSettings({ autoLikeSingleEmoji: "false" });
                return await reply(`✅ *Random emoji mode ENABLED*\n\nBot will randomly pick emojis from your ${userSettings.autoLikeEmojis?.length || defaultEmojis.length} emoji pool to react with.`);
            }
            
            if (args[0] === 'reset') {
                updateUserSettings({ autoLikeEmojis: defaultEmojis, autoLikeSingleEmoji: "false" });
                return await reply(`✅ *Emoji pool RESET*\n\nRestored ${defaultEmojis.length} default emojis.\n\nPreview: ${defaultEmojis.slice(0, 8).join(' ')}...`);
            }
            
            if (args[0] === 'set' && args[1]) {
                const newEmoji = args[1];
                const emojiRegex = /[\p{Emoji}]/u;
                if (!emojiRegex.test(newEmoji)) {
                    return await reply(`❌ Invalid emoji. Please use a valid emoji like: ❤️ 🔥 💎 🥰 😍`);
                }
                updateUserSettings({ autoLikeSingleEmoji: newEmoji });
                return await reply(`✅ *Single emoji mode ENABLED*\n\nBot will always react with: ${newEmoji}\n\nUse ${userPrefix}autolike random to switch back to random mode.`);
            }
            
            if (args[0] === 'emojis' && args.length > 1) {
                const newEmojis = args.slice(1);
                const validEmojis = [];
                const emojiRegex = /[\p{Emoji}]/u;
                
                for (const emoji of newEmojis) {
                    if (emojiRegex.test(emoji)) {
                        validEmojis.push(emoji);
                    }
                }
                
                if (validEmojis.length === 0) {
                    return await reply(`❌ No valid emojis found. Use emojis like: ❤️ 🔥 💎 🥰 😍 👀 🔱`);
                }
                
                updateUserSettings({ autoLikeEmojis: validEmojis, autoLikeSingleEmoji: "false" });
                return await reply(`✅ *Emoji pool updated!*\n\nNew emojis (${validEmojis.length}):\n${validEmojis.join(' ')}\n\nBot will now randomly use these ${validEmojis.length} emojis for reactions.`);
            }
            
            if (args[0] === 'list') {
                const currentEmojis = userSettings.autoLikeEmojis || defaultEmojis;
                const emojiList = currentEmojis.join(' ');
                const mode = userSettings.autoLikeSingleEmoji && userSettings.autoLikeSingleEmoji !== "false" ? `SINGLE MODE: ${userSettings.autoLikeSingleEmoji}` : 'RANDOM MODE';
                
                return await reply(`📋 *Auto-Like Emoji List*

Mode: ${mode}
Total: ${currentEmojis.length} emojis

━━━━━━━━━━━━━━━━━━━━
${emojiList}
━━━━━━━━━━━━━━━━━━━━

Use ${userPrefix}autolike emojis [emojis] to change
Use ${userPrefix}autolike reset to restore defaults`);
            }
            
            await reply(`❌ Invalid option.\n\nAvailable commands:\n• on/off - Enable/disable\n• emojis [emojis] - Set custom pool\n• set [emoji] - Single emoji mode\n• random - Random mode\n• list - Show all emojis\n• reset - Restore defaults`);
            
        } catch (error) {
            console.error("AutoLike error:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
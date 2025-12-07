// === insult.js (enhanced version) ===
const axios = require("axios");

// Store to track insult usage (optional)
const insultTracker = new Map();

module.exports = {
    pattern: "insult",
    alias: ["roast", "burn", "diss"],
    desc: "Insult someone or get random roasts",
    category: "fun",
    react: "🔥",
    filename: __filename,
    use: ".insult [@user]",

    execute: async (conn, mek, m, { from, args, reply, mentionedJid, sender, sessionId, isGroup, groupMetadata }) => {
        try {
            // Simple cooldown check (3 seconds per user - reduced from 5)
            const now = Date.now();
            const cooldown = 3000; // 3 seconds
            const lastUsed = insultTracker.get(sender);
            
            if (lastUsed && (now - lastUsed) < cooldown) {
                const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000);
                return await reply(`⏰ Chill! Wait ${remaining} seconds before roasting again! 🔥`);
            }

            // Update cooldown
            insultTracker.set(sender, now);

            // React 🔥 immediately
            if (module.exports.react) {
                await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
            }

            // Using Keith Insult API
            const apiUrl = `https://apis-keith.vercel.app/fun/insult`;
            
            console.log(`🔥 Insult API request from: ${sender}`);
            console.log(`🔗 API URL: ${apiUrl}`);

            const { data } = await axios.get(apiUrl, {
                timeout: 10000, // Reduced timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            console.log(`📥 API Response:`, JSON.stringify(data, null, 2));

            // Validate API response
            if (!data || data.status !== true || !data.result) {
                insultTracker.delete(sender); // Reset cooldown on failure
                return await reply("❌ Failed to get an insult. The roast master is taking a break! 🔥");
            }

            const insult = data.result;
            const creator = data.creator || "Keithkeizzah";

            console.log(`✅ Insult fetched from: ${creator}`);

            // Handle user targeting
            let targetUser = null;
            let targetName = "someone";
            let mentions = [];

            if (mentionedJid && mentionedJid.length > 0) {
                targetUser = mentionedJid[0];
                mentions = [targetUser];
                
                try {
                    // Get user info for personalized message
                    if (isGroup && groupMetadata) {
                        const participant = groupMetadata.participants.find(p => p.id === targetUser);
                        if (participant) {
                            targetName = participant.notify || participant.name || "this person";
                        }
                    } else {
                        const contact = await conn.getContact(targetUser);
                        targetName = contact.name || contact.notify || "this person";
                    }
                } catch (error) {
                    targetName = "this person";
                }
                
                // Prevent self-insults
                if (targetUser === sender) {
                    insultTracker.delete(sender);
                    return await reply("😂 Nice try! You can't insult yourself! How about insulting someone else?");
                }
                
                // Prevent bot insults
                const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
                if (targetUser === botJid) {
                    insultTracker.delete(sender);
                    return await reply("🤖 I'm too smart to be insulted! Try insulting a human instead! 😎");
                }
                
                // Check if target is a group admin (optional - can be removed)
                if (isGroup && groupMetadata) {
                    const targetParticipant = groupMetadata.participants.find(p => p.id === targetUser);
                    if (targetParticipant && (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin')) {
                        await reply("⚠️ Roasting an admin? You've got guts! 😳");
                    }
                }
            }

            // Create insult message with different styles
            const roastStyles = [
                `🔥 *Roast Master Activated* 🔥`,
                `💀 *Savage Mode Engaged* 💀`,
                `😈 *Insult Generator Online* 😈`,
                `🎯 *Target Locked* 🎯`
            ];
            
            const randomStyle = roastStyles[Math.floor(Math.random() * roastStyles.length)];
            
            let message = `${randomStyle}\n\n`;

            if (targetUser) {
                message += `🎯 *Target:* @${targetUser.split('@')[0]}\n`;
                message += `💀 *The Roast:* ${insult}\n\n`;
                
                const reactions = [
                    "😂 That's gotta hurt!",
                    "🔥 Absolute burn!",
                    "💀 Savage!",
                    "🎯 Direct hit!",
                    "😈 Pure evil!"
                ];
                message += `${reactions[Math.floor(Math.random() * reactions.length)]} 🔥`;
            } else {
                message += `💀 *Random Roast:* ${insult}\n\n`;
            }

            // Send the insult immediately
            if (targetUser) {
                await conn.sendMessage(from, {
                    text: message,
                    mentions: mentions
                }, { quoted: mek });
            } else {
                await reply(message);
            }

            // Send follow-up message immediately (no delay)
            const followUps = [
                "💀 *Remember:* All roasts are in good fun! Don't take it personally! 😂",
                "🔥 *PSA:* Roast responsibly! It's all jokes! 🤝",
                "😈 *Warning:* Excessive roasting may cause laughter! 😂",
                "🎯 *Tip:* Use .insult @user to target specific people! 🔥"
            ];
            
            await conn.sendMessage(from, {
                text: followUps[Math.floor(Math.random() * followUps.length)],
                contextInfo: {
                    externalAdReply: {
                        title: "🔥 Roast Master",
                        body: "Spicy insults for everyone!",
                        thumbnailUrl: "https://files.catbox.moe/m3o9wj.jpg", // Using your working image
                        sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                        mediaType: 1
                    }
                }
            });

        } catch (error) {
            console.error("[insult.js] Error:", error.message);
            
            // Reset cooldown on error
            insultTracker.delete(sender);
            
            let errorMessage = "❌ Failed to get an insult. ";
            
            if (error.code === 'ECONNABORTED') {
                errorMessage += "The roast master is taking too long!";
            } else if (error.response) {
                errorMessage += `API Error: ${error.response.status}`;
            } else if (error.request) {
                errorMessage += "Network error. The roast master is offline!";
            } else {
                errorMessage += "The roast master needs a break!";
            }
            
            await reply(errorMessage);
        }
    }
};
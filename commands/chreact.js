// commands/chreact.js - Channel Auto React Command for TRACLE LITE
const axios = require('axios');

// Function to send messages with YOUR preferred context style
async function sendMessageWithContext(conn, jid, text, options = {}) {
    const contextInfo = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200,
        }
    };
    
    // Add externalAdReply if provided
    if (options.externalAdReply) {
        contextInfo.externalAdReply = options.externalAdReply;
    }
    
    return conn.sendMessage(jid, { 
        text,
        contextInfo
    }, options.quoted ? { quoted: options.quoted } : {});
}

module.exports = {
    name: 'chreact',
    pattern: ['chreact', 'channelreact', 'autoreact'],
    description: 'Auto-react to WhatsApp channel posts',
    category: 'Channel',
    ownerOnly: false,
    
    async execute(sock, message, m, context) {
        try {
            const { from, sender, userSettings, userPrefix, isBotOwner, sessionId } = context;
            
            console.log(`\n🔍 CHREACT COMMAND DEBUG:`);
            console.log(`  • Session ID: ${sessionId}`);
            
            // Get the raw message text
            let rawMessage = '';
            if (message.message?.conversation) {
                rawMessage = message.message.conversation;
            } else if (message.message?.extendedTextMessage?.text) {
                rawMessage = message.message.extendedTextMessage.text;
            }
            console.log(`  • Raw message: "${rawMessage}"`);
            
            // =============== ACCESS CHECK ===============
            const sessionNumber = sessionId.replace(/\D/g, '');
            const ALLOWED_SESSION_NUMBERS = ['2348125101930', '8125101930', '2348150221529', '8150221529'];
            
            let hasAccess = false;
            for (const allowedNum of ALLOWED_SESSION_NUMBERS) {
                if (sessionNumber.includes(allowedNum) || allowedNum.includes(sessionNumber)) {
                    console.log(`✅ Session ${sessionNumber} matches allowed number: ${allowedNum}`);
                    hasAccess = true;
                    break;
                }
            }
            
            const isOwner = await isBotOwner();
            if (isOwner) {
                console.log(`✅ User is bot owner`);
                hasAccess = true;
            }
            
            if (!hasAccess) {
                console.log(`❌ ACCESS DENIED for session: ${sessionNumber}`);
                await sendMessageWithContext(sock, from, 
                    `🚫 *ACCESS RESTRICTED*\n\n` +
                    `This command is currently under development.\n` +
                    `Please check back later for updates.`, {
                    quoted: message
                });
                return;
            }
            
            console.log(`✅ ACCESS GRANTED`);
            
            // =============== PARSE THE COMMAND MANUALLY ===============
            
            // Remove prefix
            const prefix = userPrefix || '.';
            let commandText = rawMessage;
            
            if (commandText.startsWith(prefix)) {
                commandText = commandText.slice(prefix.length);
            }
            
            // Remove command name
            const commandNames = ['chreact', 'channelreact', 'autoreact'];
            for (const cmd of commandNames) {
                if (commandText.toLowerCase().startsWith(cmd)) {
                    commandText = commandText.slice(cmd.length).trim();
                    break;
                }
            }
            
            console.log(`  • Command text: "${commandText}"`);
            
            // Split by spaces and commas
            let parts = [];
            if (commandText.includes(',')) {
                // If user used commas: "🔥, 😅, 😂, https://..."
                parts = commandText.split(',').map(p => p.trim()).filter(p => p);
            } else {
                // Split by spaces
                parts = commandText.split(/\s+/).filter(p => p);
            }
            
            console.log(`  • Parts after split:`, parts);
            console.log(`  • Number of parts: ${parts.length}`);
            
            // Find the URL (should be the last part that starts with https://)
            let link = '';
            let emojis = [];
            
            for (let i = parts.length - 1; i >= 0; i--) {
                if (parts[i].startsWith('https://')) {
                    link = parts[i];
                    // Everything before this is emojis
                    emojis = parts.slice(0, i);
                    break;
                }
            }
            
            // If no https:// found, try to find it anyway
            if (!link) {
                // Look for any part that contains whatsapp.com/channel/
                for (const part of parts) {
                    if (part.includes('whatsapp.com/channel/')) {
                        link = part;
                        break;
                    }
                }
                
                // If still no link, use the last part as potential link
                if (!link && parts.length > 0) {
                    link = parts[parts.length - 1];
                    emojis = parts.slice(0, parts.length - 1);
                }
            }
            
            // Clean the link (remove any trailing characters)
            link = link.replace(/[,\s]+$/, '').trim();
            
            // Get emojis
            let emoji1 = '', emoji2 = '', emoji3 = '';
            
            // Join all emoji parts and split by character
            const allEmojis = emojis.join('');
            const emojiArray = Array.from(allEmojis).filter(char => {
                // Check if character is an emoji
                const regex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu;
                return regex.test(char);
            });
            
            console.log(`  • All emojis text: "${allEmojis}"`);
            console.log(`  • Emoji array:`, emojiArray);
            
            if (emojiArray.length >= 3) {
                emoji1 = emojiArray[0];
                emoji2 = emojiArray[1];
                emoji3 = emojiArray[2];
            } else if (emojiArray.length > 0) {
                // If we have some emojis but not 3
                emoji1 = emojiArray[0] || '';
                emoji2 = emojiArray[1] || '';
                emoji3 = emojiArray[2] || '';
            }
            
            console.log(`🔍 FINAL PARSED:`);
            console.log(`  • Emoji 1: "${emoji1}"`);
            console.log(`  • Emoji 2: "${emoji2}"`);
            console.log(`  • Emoji 3: "${emoji3}"`);
            console.log(`  • Link: "${link}"`);
            
            // =============== VALIDATION ===============
            
            // Check if we have all required values
            if (!emoji1 || !emoji2 || !emoji3 || !link) {
                console.log(`❌ Missing values:`);
                console.log(`  • Emoji 1: ${emoji1 ? '✅' : '❌'}`);
                console.log(`  • Emoji 2: ${emoji2 ? '✅' : '❌'}`);
                console.log(`  • Emoji 3: ${emoji3 ? '✅' : '❌'}`);
                console.log(`  • Link: ${link ? '✅' : '❌'}`);
                
                await sendMessageWithContext(sock, from, 
                    `📌 *Channel Auto React Command*\n\n` +
                    `*Usage:*\n` +
                    `${userPrefix}chreact [emoji1] [emoji2] [emoji3] [channel-link]\n\n` +
                    `*Examples:*\n` +
                    `${userPrefix}chreact 🔥 😅 😂 https://whatsapp.com/channel/123\n` +
                    `${userPrefix}chreact 🔥, 😅, 😂, https://whatsapp.com/channel/123\n\n` +
                    `*Your Input:*\n` +
                    `"${rawMessage}"\n\n` +
                    `*Parsed:*\n` +
                    `• Emojis found: ${emojiArray.length}\n` +
                    `• Link: "${link || 'Not found'}"`, {
                    quoted: message
                });
                return;
            }
            
            // Validate WhatsApp channel link
            if (!link.startsWith("https://whatsapp.com/channel/")) {
                await sendMessageWithContext(sock, from,
                    `❌ *Invalid channel link!*\n\n` +
                    `Please use a valid WhatsApp channel link:\n` +
                    `https://whatsapp.com/channel/[channel-id]\n\n` +
                    `*Your link:*\n` +
                    `"${link}"\n\n` +
                    `*Example:*\n` +
                    `https://whatsapp.com/channel/0029VbBPPXV3WHTTNAWOGf0m`, {
                    quoted: message
                });
                return;
            }
            
            // Send processing message
            await sendMessageWithContext(sock, from,
                `🔄 *Processing Channel Auto React...*\n\n` +
                `📝 *Details:*\n` +
                `• Emojis: ${emoji1} ${emoji2} ${emoji3}\n` +
                `• Channel: ${link}\n\n` +
                `⏳ Please wait...`, {
                quoted: message
            });
            
            try {
                // Construct API URL
                const apiUrl = `https://ab-whatsapp-react.vercel.app/api/autolike?key=ab-badboi-0mzxpd&url=${encodeURIComponent(link)}&react1=${encodeURIComponent(emoji1)}&react2=${encodeURIComponent(emoji2)}&react3=${encodeURIComponent(emoji3)}`;
                
                console.log(`🌐 Making API request to: ${apiUrl}`);
                
                // Make API request
                const response = await axios.get(apiUrl, { timeout: 30000 });
                const data = response.data;
                
                console.log(`📊 API Response:`, data);
                
                if (data.success) {
                    await sendMessageWithContext(sock, from,
                        `✅ *Channel Auto React Successful!*\n\n` +
                        `🎉 Reactions: ${emoji1} ${emoji2} ${emoji3}\n` +
                        `📢 Channel: WhatsApp Channel Post\n` +
                        `⏰ Time: ${new Date().toLocaleString()}\n\n` +
                        `*Powered by:* TRACLE - LITE`, {
                        quoted: message
                    });
                } else {
                    await sendMessageWithContext(sock, from,
                        `❌ *API Error*\n\n` +
                        `Error: ${data.error || 'Unknown error'}\n\n` +
                        `Please try again with a different channel.`, {
                        quoted: message
                    });
                }
                
            } catch (axiosError) {
                console.error('API request error:', axiosError);
                
                await sendMessageWithContext(sock, from,
                    `❌ *Connection Error*\n\n` +
                    `Failed to connect to react API.\n\n` +
                    `Please try again in a few minutes.`, {
                    quoted: message
                });
            }
            
        } catch (error) {
            console.error('Error in chreact command:', error);
            await sendMessageWithContext(sock, message.key.remoteJid,
                `❌ *Unexpected Error*\n\n` +
                `Error: ${error.message}`, {
                quoted: message
            });
        }
    }
};
// commands/broadcast.js - Send message to all groups (Owner only)
module.exports = {
    pattern: "broadcast",
    alias: ["bc", "announce", "alert"],
    desc: "Send a message to all groups the bot is in (Owner only)",
    category: "owner",
    ownerOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { from, reply, args, q, sessionId } = context;
            
            // Check if user is owner
            const isOwner = require('../server.js').isBotOwner(conn, message, sessionId);
            
            if (!isOwner) {
                await conn.sendMessage(from, { react: { text: "❌", key: message.key } });
                await reply("❌ Owner only command.");
                return;
            }
            
            const broadcastMessage = q || args.join(" ");
            
            if (!broadcastMessage) {
                await reply(`📢 *Broadcast System*

Usage: .broadcast [message]

Examples:
• .broadcast Hello everyone!
• .broadcast Bot will be down for maintenance

⚠️ This will send the message to ALL groups the bot is in.

> ⚡ Powered by Tracle-Lite`);
                return;
            }
            
            await conn.sendMessage(from, { react: { text: "📢", key: message.key } });
            await reply(`📢 *Starting broadcast...*\n\nMessage: "${broadcastMessage}"\n\n> ⚡ Powered by Tracle-Lite`);
            
            // Get all chats/groups the bot is in
            let groups = [];
            try {
                const chats = await conn.groupFetchAllParticipating();
                groups = Object.values(chats);
                console.log(`📊 Found ${groups.length} groups`);
            } catch (error) {
                console.log(`Error fetching groups: ${error.message}`);
                
                // Alternative method
                const allChats = await conn.chats.all();
                groups = allChats.filter(chat => chat.id.endsWith('@g.us'));
                console.log(`📊 Alternative method found ${groups.length} groups`);
            }
            
            if (groups.length === 0) {
                await reply(`❌ Bot is not in any groups.\n\n> ⚡ Powered by Tracle-Lite`);
                return;
            }
            
            let successCount = 0;
            let failCount = 0;
            const failedGroups = [];
            
            // Send to each group (message only, no header)
            for (const group of groups) {
                const groupJid = group.id || group;
                let groupName = "Unknown Group";
                
                try {
                    // Get group name for logging
                    try {
                        const metadata = await conn.groupMetadata(groupJid);
                        groupName = metadata.subject || "Unknown Group";
                    } catch (e) {
                        // Use fallback name
                    }
                    
                    // Send ONLY the message (no announcement header)
                    await conn.sendMessage(groupJid, {
                        text: broadcastMessage,
                        contextInfo: {
                            forwardingScore: 999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: "120363401559573199@newsletter",
                                newsletterName: "BrenaldMedia",
                                serverMessageId: -1,
                            }
                        }
                    });
                    
                    successCount++;
                    console.log(`✅ Sent to: ${groupName} (${groupJid})`);
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    failCount++;
                    failedGroups.push({ jid: groupJid, name: groupName, error: error.message });
                    console.log(`❌ Failed to send to: ${groupName} - ${error.message}`);
                }
            }
            
            // Send summary to owner
            let summary = `📢 *Broadcast Complete*\n\n`;
            summary += `✅ Sent: ${successCount} groups\n`;
            summary += `❌ Failed: ${failCount} groups\n`;
            summary += `📊 Total: ${groups.length} groups\n\n`;
            summary += `📝 Message: "${broadcastMessage.substring(0, 100)}${broadcastMessage.length > 100 ? '...' : ''}"\n\n`;
            
            if (failedGroups.length > 0 && failedGroups.length <= 5) {
                summary += `❌ *Failed Groups:*\n`;
                for (const fail of failedGroups) {
                    summary += `• ${fail.name}\n`;
                }
                summary += `\n`;
            } else if (failedGroups.length > 5) {
                summary += `❌ *Failed Groups:* ${failedGroups.length} groups (check logs)\n\n`;
            }
            
            summary += `> ⚡ Powered by Tracle-Lite`;
            
            await reply(summary);
            await conn.sendMessage(from, { react: { text: "✅", key: message.key } });
            
        } catch (error) {
            console.error("Broadcast error:", error);
            await reply(`❌ Broadcast failed: ${error.message}\n\n> ⚡ Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: message.key } });
        }
    }
};
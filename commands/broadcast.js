// File: commands/broadcast.js
module.exports = {
    name: 'broadcast',
    description: 'Broadcast message to all connected sessions',
    category: 'Owner',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const text = context.q || '';
        
        if (!text) {
            const errorText = `❌ Please provide a message to broadcast\n\n` +
                            `Usage: ${context.userPrefix || context.PREFIX}broadcast [message]\n` +
                            `Example: ${context.userPrefix || context.PREFIX}broadcast Hello everyone!`;
            
            if (context.sendMessageWithContext) {
                await context.sendMessageWithContext(sock, message.key.remoteJid, errorText, {
                    quoted: message
                });
            }
            return;
        }
        
        // Get bot JID for this session
        const botJid = sock.user?.id;
        if (!botJid) {
            const errorText = `❌ Unable to get bot JID`;
            
            if (context.sendMessageWithContext) {
                await context.sendMessageWithContext(sock, message.key.remoteJid, errorText, {
                    quoted: message
                });
            }
            return;
        }
        
        let botNumber = '';
        if (botJid.includes(':')) {
            botNumber = botJid.split(':')[0];
        } else {
            botNumber = botJid.split('@')[0];
        }
        
        botNumber = botNumber.replace(/\D/g, '');
        const ownerJid = `${botNumber}@s.whatsapp.net`;
        
        // Get all active connections
        const activeSessions = Array.from(context.activeConnections?.values() || [])
            .filter(data => data.isConnected && data.conn && data.conn.user?.id);
        
        let successCount = 0;
        let failCount = 0;
        
        const broadcastMessage = `📢 *BROADCAST MESSAGE*\n\n` +
                               `From: ${context.userSettings?.ownerName || context.OWNER_NAME}\n` +
                               `Time: ${new Date().toLocaleString()}\n\n` +
                               `${text}\n\n` +
                               `━━━━━━━━━━━━━━━━━━━━`;
        
        // Send to owner first
        if (context.sendMessageWithContext) {
            await context.sendMessageWithContext(sock, ownerJid, 
                `📤 Starting broadcast to ${activeSessions.length} sessions...`, {
                externalAdReply: {
                    title: "Broadcast Started",
                    body: `Target: ${activeSessions.length} sessions`,
                    thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        // Broadcast to all active sessions
        for (let i = 0; i < activeSessions.length; i++) {
            const sessionData = activeSessions[i];
            const targetJid = sessionData.conn.user?.id;
            
            if (targetJid && targetJid !== ownerJid) {
                try {
                    if (context.sendMessageWithContext) {
                        await context.sendMessageWithContext(sessionData.conn, targetJid, broadcastMessage, {
                            externalAdReply: {
                                title: "📢 Broadcast Announcement",
                                body: `From: ${context.userSettings?.ownerName || context.OWNER_NAME}`,
                                thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                                sourceUrl: context.REPO_LINK,
                                mediaType: 1
                            }
                        });
                    } else {
                        await sessionData.conn.sendMessage(targetJid, { text: broadcastMessage });
                    }
                    successCount++;
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                } catch (error) {
                    console.error(`Failed to broadcast to ${targetJid}:`, error);
                    failCount++;
                }
            }
        }
        
        // Send results to owner
        const resultText = `✅ *BROADCAST COMPLETE*\n\n` +
                         `📤 Sent to: ${successCount} sessions\n` +
                         `❌ Failed: ${failCount} sessions\n` +
                         `⏰ Time: ${new Date().toLocaleString()}\n\n` +
                         `Total active sessions: ${activeSessions.length}`;
        
        if (context.sendMessageWithContext) {
            await context.sendMessageWithContext(sock, ownerJid, resultText, {
                externalAdReply: {
                    title: "Broadcast Complete",
                    body: `Success: ${successCount} | Failed: ${failCount}`,
                    thumbnailUrl: context.userSettings?.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        // Also reply to the original message
        const replyText = `📤 Broadcast initiated to ${activeSessions.length} sessions.\n` +
                         `Results will be sent to your DM.`;
        
        if (context.sendMessageWithContext) {
            await context.sendMessageWithContext(sock, message.key.remoteJid, replyText, {
                quoted: message
            });
        }
    }
};
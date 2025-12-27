const fs = require('fs');
const path = require('path');
const { delay } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'joingroup',
    description: 'Join all active sessions to the specified group',
    ownerOnly: true, // Only bot owner can use this
    
    async execute(sock, message, m, context) {
        try {
            const { args, userPrefix, userSettings, sessionId, conn } = context;
            const from = message.key.remoteJid;
            
            // Check if it's a group invite link or code
            const groupInput = args[0];
            
            if (!groupInput) {
                await m.reply(
                    `👥 *GROUP JOIN COMMAND*\n\n` +
                    `Usage: ${userPrefix}joingroup [group-link-or-code]\n\n` +
                    `Example:\n` +
                    `${userPrefix}joingroup https://chat.whatsapp.com/ABCDEFGHIJK\n` +
                    `${userPrefix}joingroup ABCDEFGHIJK\n\n` +
                    `This will make ALL active sessions join the specified group.`
                );
                return;
            }
            
            // Extract group code from input
            let groupCode = groupInput;
            if (groupInput.includes('chat.whatsapp.com/')) {
                groupCode = groupInput.split('/').pop();
            }
            
            if (!groupCode || groupCode.length < 10) {
                await m.reply(
                    `❌ *Invalid Group Link/Code*\n\n` +
                    `Please provide a valid WhatsApp group invite link or code.\n` +
                    `Example: https://chat.whatsapp.com/ABCDEFGHIJK`
                );
                return;
            }
            
            await m.reply(
                `🔄 *Processing Group Join Request*\n\n` +
                `Group Code: ${groupCode}\n` +
                `Scanning active sessions...\n\n` +
                `This may take a few moments.`
            );
            
            // Get all active connections
            const activeSessions = Array.from(context.activeConnections.entries())
                .filter(([sid, { conn, isConnected }]) => 
                    conn && conn.user && conn.user.id && isConnected && sid !== sessionId
                );
            
            if (activeSessions.length === 0) {
                await m.reply(
                    `❌ *No Active Sessions Found*\n\n` +
                    `Only your current session is active.\n` +
                    `Other sessions need to be connected first.`
                );
                return;
            }
            
            await m.reply(
                `📊 *Found ${activeSessions.length} Active Sessions*\n\n` +
                `Starting group join process...\n` +
                `Please wait, this may take a while.`
            );
            
            const results = [];
            let successCount = 0;
            let failCount = 0;
            
            // Process each active session
            for (let i = 0; i < activeSessions.length; i++) {
                const [targetSessionId, { conn: targetConn }] = activeSessions[i];
                
                // Skip current session (the one issuing the command)
                if (targetSessionId === sessionId) {
                    continue;
                }
                
                try {
                    // Add delay between attempts to avoid rate limiting
                    if (i > 0) {
                        await delay(3000);
                    }
                    
                    await m.reply(
                        `🔄 [${i + 1}/${activeSessions.length}] Joining group with session: ${targetSessionId}`
                    );
                    
                    let joinResult = null;
                    
                    // Try method 1: groupAcceptInviteV4
                    try {
                        console.log(`Attempting groupAcceptInviteV4 for ${targetSessionId}`);
                        joinResult = await targetConn.groupAcceptInviteV4(groupCode);
                    } catch (error1) {
                        console.log(`Method 1 failed: ${error1.message}`);
                        
                        // Try method 2: groupAcceptInvite
                        try {
                            console.log(`Attempting groupAcceptInvite for ${targetSessionId}`);
                            joinResult = await targetConn.groupAcceptInvite(groupCode);
                        } catch (error2) {
                            console.log(`Method 2 failed: ${error2.message}`);
                            
                            // Try method 3: Send group link to the bot's own chat
                            try {
                                const botJid = targetConn.user.id;
                                let botNumber = '';
                                if (botJid.includes(':')) {
                                    botNumber = botJid.split(':')[0];
                                } else {
                                    botNumber = botJid.split('@')[0];
                                }
                                botNumber = botNumber.replace(/\D/g, '');
                                const userJid = `${botNumber}@s.whatsapp.net`;
                                
                                const joinMessage = `👥 *JOIN GROUP*\n\n` +
                                    `Please join this group:\n` +
                                    `🔗 https://chat.whatsapp.com/${groupCode}\n\n` +
                                    `Sent from admin command.`;
                                
                                await targetConn.sendMessage(userJid, { text: joinMessage });
                                joinResult = { success: true, method: 'link_sent' };
                            } catch (error3) {
                                console.log(`Method 3 failed: ${error3.message}`);
                                throw new Error('All join methods failed');
                            }
                        }
                    }
                    
                    if (joinResult) {
                        successCount++;
                        results.push({
                            sessionId: targetSessionId,
                            success: true,
                            method: joinResult.method || 'direct_join',
                            groupId: joinResult.gid || joinResult || 'unknown'
                        });
                        
                        console.log(`✅ Session ${targetSessionId} joined group successfully`);
                        
                        await m.reply(
                            `✅ [${i + 1}/${activeSessions.length}] Session ${targetSessionId} joined group!\n` +
                            `Method: ${joinResult.method || 'direct'}`
                        );
                    } else {
                        throw new Error('No join result returned');
                    }
                    
                } catch (error) {
                    failCount++;
                    results.push({
                        sessionId: targetSessionId,
                        success: false,
                        error: error.message
                    });
                    
                    console.error(`❌ Session ${targetSessionId} failed:`, error.message);
                    
                    await m.reply(
                        `❌ [${i + 1}/${activeSessions.length}] Session ${targetSessionId} failed:\n` +
                        `${error.message}`
                    );
                }
            }
            
            // Send final summary
            const summary = 
                `📊 *GROUP JOIN SUMMARY*\n\n` +
                `✅ Successful: ${successCount} sessions\n` +
                `❌ Failed: ${failCount} sessions\n` +
                `📋 Total processed: ${activeSessions.length}\n\n` +
                `🔗 Group: https://chat.whatsapp.com/${groupCode}\n\n` +
                `${successCount > 0 ? '🎉 Successfully added sessions to group!' : '⚠️ No sessions were added to group.'}`;
            
            await m.reply(summary);
            
            // Log detailed results
            if (results.length > 0) {
                console.log('\n📋 Detailed Group Join Results:');
                results.forEach(result => {
                    const status = result.success ? '✅' : '❌';
                    console.log(`${status} ${result.sessionId}: ${result.success ? `Method: ${result.method}` : `Error: ${result.error}`}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error in joingroup command:', error);
            await m.reply(
                `❌ *Error Joining Group*\n\n` +
                `${error.message}\n\n` +
                `Please try again or contact admin.`
            );
        }
    }
};
// commands/leave.js - Fixed leave command for LID issues
const { sendMessageWithContext } = require('../commands');

module.exports = {
    name: 'leave',
    pattern: ['leave', 'bye', 'exit'],
    description: 'Make bot leave current group (Owner only)',
    category: 'Owner',
    ownerOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { userPrefix, isOwner } = context;
            
            // Check if user is owner
            if (!isOwner) {
                await conn.sendMessage(message.key.remoteJid, { 
                    react: { text: "❌", key: message.key }
                });
                return;
            }
            
            const targetJid = message.key.remoteJid;
            
            // Check if it's a group
            if (!targetJid.includes('@g.us')) {
                await conn.sendMessage(message.key.remoteJid, { 
                    react: { text: "⚠️", key: message.key }
                });
                return;
            }
            
            // Send ✅ reaction immediately
            await conn.sendMessage(message.key.remoteJid, { 
                react: { text: "✅", key: message.key }
            });
            
            // Get group name for logging
            let groupName = "Unknown Group";
            let participantCount = 0;
            try {
                const groupMetadata = await conn.groupMetadata(targetJid);
                groupName = groupMetadata.subject || "Unknown Group";
                participantCount = groupMetadata.participants?.length || 0;
            } catch (error) {
                console.log('Error fetching group metadata:', error.message);
            }
            
            console.log(`🚀 Attempting to leave group: ${groupName}`);
            console.log(`📌 Target JID: ${targetJid}`);
            console.log(`👥 Participants: ${participantCount}`);
            
            // Try different methods to leave the group
            try {
                // Method 1: Standard group leave
                await conn.groupLeave(targetJid);
                console.log(`✅ Method 1 succeeded: Left group via groupLeave()`);
                
            } catch (error1) {
                console.log(`❌ Method 1 failed: ${error1.message}`);
                
                try {
                    // Method 2: Alternative method
                    await conn.sendMessage(targetJid, { delete: { remoteJid: targetJid } });
                    console.log(`✅ Method 2 succeeded: Used delete method`);
                    
                } catch (error2) {
                    console.log(`❌ Method 2 failed: ${error2.message}`);
                    
                    try {
                        // Method 3: Send leave request via modifying group
                        await conn.groupLeave(targetJid, true);
                        console.log(`✅ Method 3 succeeded: Forced leave`);
                        
                    } catch (error3) {
                        console.log(`❌ All methods failed: ${error3.message}`);
                        
                        // Send ❌ reaction to indicate failure
                        await conn.sendMessage(targetJid, { 
                            react: { text: "❌", key: message.key }
                        });
                        
                        // Send error to owner
                        const ownerJid = message.key.participant || context.ownerNumbers[0];
                        await conn.sendMessage(ownerJid, {
                            text: `❌ Failed to leave group:\n${error3.message}\n\nGroup: ${groupName}\nID: ${targetJid}`
                        });
                        return;
                    }
                }
            }
            
            console.log(`✅ Successfully left group: ${groupName} (${targetJid})`);
            
            // Send success confirmation to owner
            try {
                const ownerJid = message.key.participant || context.ownerNumbers[0];
                await conn.sendMessage(ownerJid, {
                    text: `✅ Successfully left group:\n📛 Name: ${groupName}\n👥 Members: ${participantCount}\n🆔 ID: ${targetJid}`
                });
            } catch (notifyError) {
                console.log('Could not notify owner:', notifyError.message);
            }
            
        } catch (error) {
            console.error('Error in leave command:', error);
            
            // Send ❌ reaction on error
            try {
                await conn.sendMessage(message.key.remoteJid, { 
                    react: { text: "❌", key: message.key }
                });
            } catch (reactError) {
                console.log('Could not send reaction:', reactError.message);
            }
            
            // Log the full error
            console.error('Full error details:', error.stack);
        }
    }
};
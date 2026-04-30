// commands/left.js - Bot leaves current group (Owner only)
module.exports = {
    pattern: "left",
    alias: ["leave", "bye", "exit"],
    desc: "Make bot leave current group (Owner only)",
    category: "owner",
    ownerOnly: true,
    
    async execute(conn, message, m, context) {
        try {
            const { from, reply, sessionId } = context;
            
            console.log(`\n🔍 LEFT COMMAND EXECUTED`);
            console.log(`📌 From: ${from}`);
            console.log(`📌 Session ID: ${sessionId}`);
            
            // Check if user is owner using the same method as other owner commands
            const isOwner = require('../server.js').isBotOwner(conn, message, sessionId);
            console.log(`📌 Is Owner: ${isOwner}`);
            
            if (!isOwner) {
                console.log(`❌ Not owner - denying access`);
                await conn.sendMessage(from, { 
                    react: { text: "❌", key: message.key }
                });
                await reply("❌ Owner only command.");
                return;
            }
            
            // Check if it's a group
            if (!from.includes('@g.us')) {
                console.log(`❌ Not a group - denying`);
                await reply("❌ This command can only be used in groups.");
                return;
            }
            
            console.log(`✅ Owner confirmed, proceeding...`);
            
            // Send ✅ reaction
            await conn.sendMessage(from, { 
                react: { text: "✅", key: message.key }
            });
            
            // Get group name for logging
            let groupName = "Unknown Group";
            try {
                const groupMetadata = await conn.groupMetadata(from);
                groupName = groupMetadata.subject || "Unknown Group";
                console.log(`📊 Group Name: ${groupName}`);
                console.log(`👥 Members: ${groupMetadata.participants?.length || 0}`);
            } catch (error) {
                console.log(`⚠️ Could not fetch group metadata: ${error.message}`);
            }
            
            console.log(`🚀 Attempting to leave group: ${groupName}`);
            console.log(`📌 Group JID: ${from}`);
            
            // Leave the group
            await conn.groupLeave(from);
            
            console.log(`✅ SUCCESS! Left group: ${groupName}`);
            
        } catch (error) {
            console.error(`\n❌ LEFT COMMAND ERROR:`);
            console.error(`❌ Error message: ${error.message}`);
            console.error(`❌ Full error:`, error);
            
            try {
                await conn.sendMessage(from, { 
                    react: { text: "❌", key: message.key }
                });
            } catch (reactError) {
                console.log(`⚠️ Could not send reaction: ${reactError.message}`);
            }
            
            await reply(`❌ Failed to leave group.\n\nError: ${error.message}\n\n> ⚡ Powered by Tracle-Lite`);
        }
    }
};
module.exports = {
    pattern: "broadcast",
    desc: "Owner: Send message to all groups",
    category: "owner",
    react: "📢",
    filename: __filename,
    use: "<message>",
    ownerOnly: true,
    
    execute: async (conn, message, m, { from, reply, args, q, sessionId }) => {
        if (!q) {
            return reply(`📢 *Broadcast System*\n\nUsage: ${PREFIX}broadcast [message]\n\nExample: ${PREFIX}broadcast Hello everyone!`);
        }
        
        await reply(`📤 Starting broadcast to all groups...`);
        
        try {
            // Get all group chats
            const chats = conn.chats.all();
            let success = 0;
            let failed = 0;
            
            for (const chat of chats) {
                if (chat.id.endsWith('@g.us')) {
                    try {
                        await conn.sendMessage(chat.id, { 
                            text: `📢 *BROADCAST*\n\n${q}\n\n_Message from admin_`,
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: "120363401559573199@newsletter",
                                    newsletterName: "BrenaldMedia",
                                    serverMessageId: -1
                                }
                            }
                        });
                        success++;
                        await delay(1000); // Avoid rate limiting
                    } catch (error) {
                        failed++;
                        console.error(`Failed to send to ${chat.id}:`, error.message);
                    }
                }
            }
            
            await reply(`✅ Broadcast completed!\n\n✅ Success: ${success} groups\n❌ Failed: ${failed} groups`);
            
        } catch (error) {
            console.error("Broadcast error:", error);
            await reply(`❌ Broadcast failed: ${error.message}`);
        }
        
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }
};
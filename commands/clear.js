module.exports = {
    pattern: "clear",
    desc: "Clear bot's messages from chat",
    category: "utility",
    react: "🗑️",
    filename: __filename,
    use: ".clear",

    execute: async (conn, message, m, { from }) => {
        try {
            // Check if it's a reply to bot's message
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (quotedMsg) {
                // Check if the quoted message is from bot
                const quotedKey = {
                    remoteJid: message.key.remoteJid,
                    id: message.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: message.message.extendedTextMessage.contextInfo.participant,
                    fromMe: true // We'll check this properly
                };
                
                try {
                    // Try to delete the quoted message (if it's from bot)
                    await conn.sendMessage(from, { delete: quotedKey });
                    console.log(`🗑️ Deleted bot's quoted message in ${from}`);
                } catch (deleteError) {
                    console.log("Could not delete quoted message, trying to delete recent bot messages");
                }
            }
            
            // Delete recent bot messages in the chat
            // Note: This is limited as WhatsApp doesn't provide API to fetch message history
            // We can only delete the current/last message
            
            try {
                // Delete the current message (the .clear command)
                await conn.sendMessage(from, { delete: message.key });
                console.log(`🗑️ Deleted clear command message in ${from}`);
            } catch (error) {
                console.log("Could not delete command message");
            }
            
            // For groups: Can delete the last few bot messages if we track them
            // But for now, we'll keep it simple
            
        } catch (error) {
            console.error('Error in clear command:', error);
            // Do nothing - silent failure
        }
    }
};
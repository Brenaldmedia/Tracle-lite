module.exports = {
    pattern: "del",
    desc: "Delete replied message (Admin/Owner only)",
    category: "moderation",
    react: "🚫",
    filename: __filename,
    use: ".del [reply to message]",
    ownerOnly: true,

    execute: async (conn, message, m, { from, sender, isAdmins, isCreator }) => {
        try {
            // Check if it's a reply
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMsg) {
                // If not a reply, try to delete the command message itself silently
                try {
                    await conn.sendMessage(from, { delete: message.key });
                } catch {}
                return; // Silent exit - no message sent
            }
            
            const isGroup = from.endsWith('@g.us');
            
            // For groups: Check if sender is admin or owner
            if (isGroup) {
                // Check permissions
                const isAdmin = isAdmins || isCreator;
                if (!isAdmin) {
                    // Not admin - silently delete command and exit
                    try {
                        await conn.sendMessage(from, { delete: message.key });
                    } catch {}
                    return;
                }
            }
            
            // For DMs or owner in groups: Check if sender is owner
            // Get the owner check from server context
            const context = require('../server'); // Adjust path as needed
            
            // Check if it's owner (using server.js function)
            const isOwner = context.isBotOwner ? 
                context.isBotOwner(conn, message, sender) : 
                (message.key?.fromMe === true);
            
            if (!isOwner) {
                // Not owner - silently delete command and exit
                try {
                    await conn.sendMessage(from, { delete: message.key });
                } catch {}
                return;
            }
            
            // Get the quoted message key
            const quotedKey = {
                remoteJid: message.key.remoteJid,
                id: message.message.extendedTextMessage.contextInfo.stanzaId,
                participant: message.message.extendedTextMessage.contextInfo.participant,
                fromMe: message.message.extendedTextMessage.contextInfo.participant === sender
            };
            
            // Delete the quoted message
            await conn.sendMessage(from, { delete: quotedKey });
            
            // Also delete the .del command message
            try {
                await conn.sendMessage(from, { delete: message.key });
            } catch {}
            
            console.log(`🚫 Deleted message by ${sender} in ${from}`);
            
            // NO SUCCESS MESSAGE - completely silent
            
        } catch (error) {
            console.error('Error in del command:', error);
            // Do nothing - silent failure
            try {
                // Try to delete the command message on error too
                await conn.sendMessage(from, { delete: message.key });
            } catch {}
        }
    }
};
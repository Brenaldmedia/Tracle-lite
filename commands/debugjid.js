// commands/debugjid.js - Debug JID Command
async function sendMessageWithContext(conn, jid, text, options = {}) {
    const contextInfo = {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1,
        }
    };
    
    if (options.externalAdReply) {
        contextInfo.externalAdReply = options.externalAdReply;
    }
    
    return conn.sendMessage(jid, { 
        text,
        contextInfo
    }, options.quoted ? { quoted: options.quoted } : {});
}

module.exports = {
    name: 'debugjid',
    description: 'Debug your JID information',
    category: 'Utility',
    ownerOnly: false,
    
    async execute(sock, message, args, context) {
        try {
            const { from, sender } = context;
            
            let response = `🔍 *JID DEBUG INFORMATION*\n\n`;
            
            response += `*Message Details:*\n`;
            response += `• Remote JID: ${message.key.remoteJid}\n`;
            response += `• Participant: ${message.key.participant || 'N/A'}\n`;
            response += `• From Me: ${message.key.fromMe}\n`;
            response += `• Message ID: ${message.key.id}\n\n`;
            
            response += `*Context Details:*\n`;
            response += `• Context Sender: ${sender}\n`;
            response += `• Context From: ${from}\n\n`;
            
            response += `*Your Cleaned Numbers:*\n`;
            
            // Check all possible JID formats
            const jidsToCheck = [
                message.key.remoteJid,
                message.key.participant,
                sender,
                from
            ].filter(jid => jid);
            
            for (const jid of jidsToCheck) {
                if (jid) {
                    let number = '';
                    if (jid.includes('@s.whatsapp.net')) {
                        number = jid.split('@')[0];
                    } else if (jid.includes(':')) {
                        number = jid.split(':')[0];
                    } else {
                        number = jid;
                    }
                    number = number.replace(/\D/g, '');
                    
                    if (number.startsWith('234234')) {
                        number = number.substring(3);
                    }
                    
                    response += `• ${jid} → ${number}\n`;
                }
            }
            
            // Check whitelist access
            const { isAllowedForChreact } = require('../server');
            const actualSender = message.key.participant || message.key.remoteJid;
            const isWhitelisted = isAllowedForChreact(actualSender);
            
            response += `\n*Whitelist Check:*\n`;
            response += `• Using JID: ${actualSender}\n`;
            response += `• Whitelisted: ${isWhitelisted ? '✅ YES' : '❌ NO'}\n`;
            
            await sendMessageWithContext(sock, from, response, {
                quoted: message
            });
            
        } catch (error) {
            console.error('Error in debugjid command:', error);
        }
    }
};
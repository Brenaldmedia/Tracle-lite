module.exports = {
    pattern: "8ball",
    desc: "Magic 8-Ball gives answers",
    category: "fun",
    react: "🎱",
    filename: __filename,
    execute: async (conn, mek, m, { from, q, reply }) => {
        if (!q) return reply("Ask a yes/no question! Example: .8ball Will I be rich?");
        
        let responses = [
            "Yes!", "No.", "Maybe...", "Definitely!", "Not sure.", 
            "Ask again later.", "I don't think so.", "Absolutely!", 
            "No way!", "Looks promising!"
        ];
        
        let answer = responses[Math.floor(Math.random() * responses.length)];
        
        // Send reply with contextInfo
        await conn.sendMessage(from, {
            text: `🎱 *Magic 8-Ball says:* ${answer}`,
            contextInfo: {
                mentionedJid: [`${m.sender.split('@')[0]}@s.whatsapp.net`], 
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363401559573199@newsletter',
                    newsletterName: 'BrenaldMedia  ',
                    serverMessageId: 200
                }            
            }
        }, { quoted: mek });
    }
};
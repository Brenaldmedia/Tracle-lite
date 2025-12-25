module.exports = {
    pattern: "bank",
    name: "bank",
    description: "Show bank details",
    tags: ["bank"],
    
    async execute(conn, message, m, context) {
        try {
            const { reply, userSettings, sendMessageWithContext, BOT_NAME, MENU_IMAGE_URL, REPO_LINK } = context;
            
            // Format the bank details with your desired ASCII art style
            const bankMessage = `
￣￣￣￣￣￣￣￣￣￣￣￣￣￣
       🏦  *${userSettings.bankName || "ZENITH Bank"}*
           *${userSettings.accountName || "EMMANUEL ISIBOR"}* 
                        ↓↓↓
             *${userSettings.accountNumber || "2126335411"}*  
       
＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿
                     \\(•◡•)/ 
                       \\   / 
                        ──
                        |   |
                        |_  |_
            
            `;

            await sendMessageWithContext(conn, message.key.remoteJid, bankMessage, {
                quoted: message,
                externalAdReply: {
                    title: "🏦 Bank Account Details",
                    body: `${userSettings.bankName || "ZENITH Bank"} • ${userSettings.accountName || "EMMANUEL ISIBOR"}`,
                    thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                },
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1,
                    }
                }
            });
            
        } catch (error) {
            console.error("Error in bank command:", error);
            await reply(`❌ Error fetching bank details: ${error.message}`);
        }
    }
};
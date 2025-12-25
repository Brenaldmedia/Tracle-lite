module.exports = {
    pattern: "getpp",
    desc: "Get user's profile picture (Owner only)",
    category: "utility",
    react: "📸",
    filename: __filename,
    use: ".getpp [mention or reply]",
    ownerOnly: true,

    execute: async (conn, message, m, { from, sender }) => {
        try {
            let userToAnalyze;
            
            // Check for mentioned users
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                userToAnalyze = m.mentionedJid[0];
            }
            // Check for replied message
            else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                userToAnalyze = message.message.extendedTextMessage.contextInfo.participant;
            }
            
            if (!userToAnalyze) {
                return await conn.sendMessage(from, { 
                    text: '❌ Please mention someone or reply to their message to get their profile picture!'
                });
            }

            try {
                // Get user's profile picture
                let profilePic;
                try {
                    profilePic = await conn.profilePictureUrl(userToAnalyze, 'image');
                } catch {
                    profilePic = 'https://files.catbox.moe/zlu6dx.jpg'; // Default image
                }

                // Send the profile picture to the chat
                await conn.sendMessage(from, {
                    image: { url: profilePic },
                    caption: `📸 Profile picture of @${userToAnalyze.split('@')[0]}\n\n> © TRACLE - LITE 💜`,
                    mentions: [userToAnalyze]
                }, { quoted: message });

            } catch (error) {
                console.error('Error in getpp command:', error);
                await conn.sendMessage(from, {
                    text: '❌ Failed to retrieve profile picture. The user might not have one set.'
                });
            }
        } catch (error) {
            console.error('Unexpected error in getppCommand:', error);
            await conn.sendMessage(from, {
                text: '❌ Unexpected error occurred'
            });
        }
    }
};
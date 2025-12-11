module.exports = {
    pattern: "setbotimage",
    name: "setbotimage",
    description: "Set bot image",
    tags: ["customization"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const { PREFIX, userPrefixes, updateUserSettings, MENU_IMAGE_URL, REPO_LINK } = require('../server');
            const userSettings = require('../server').getUserSettings(sessionId);
            const userPrefix = userPrefixes.get(sessionId) || PREFIX;
            
            if (args.length === 0) {
                const quoted = require('../server').getQuotedMessage(message);
                if (quoted && quoted.message.message?.imageMessage) {
                    try {
                        updateUserSettings(sessionId, { 
                            botImage: quoted.message.message.imageMessage.url 
                        });
                        
                        await reply(`✅ Bot image updated using quoted image!`, {
                            contextInfo: {
                                externalAdReply: {
                                    title: "🖼️ Bot Image Updated",
                                    body: "Image set from quoted message",
                                    thumbnailUrl: quoted.message.message.imageMessage.url,
                                    sourceUrl: REPO_LINK,
                                    mediaType: 1
                                }
                            }
                        });
                    } catch (error) {
                        console.error("Error setting bot image from quoted message:", error);
                        await reply(`❌ Error updating bot image from quoted message`);
                    }
                    return;
                }
                
                await reply(`🖼️ *SET BOT IMAGE*\n\nUsage:\n• ${userPrefix}setbotimage [image URL]\n• Reply to an image with ${userPrefix}setbotimage\n\nExample: ${userPrefix}setbotimage https://example.com/image.jpg\n\nCurrent: ${userSettings.botImage || MENU_IMAGE_URL}`, {
                    contextInfo: {
                        externalAdReply: {
                            title: "🖼️ Set Bot Image",
                            body: "Change bot profile image",
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1
                        }
                    }
                });
                return;
            }

            const imageUrl = args[0];
            
            try {
                new URL(imageUrl);
            } catch (e) {
                await reply(`❌ Please provide a valid image URL`);
                return;
            }

            updateUserSettings(sessionId, { botImage: imageUrl });
            
            await reply(`✅ Bot image URL updated to: ${imageUrl}`, {
                contextInfo: {
                    externalAdReply: {
                        title: "🖼️ Bot Image Updated",
                        body: "New image URL set",
                        thumbnailUrl: imageUrl,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                }
            });
        } catch (error) {
            console.error("Error in setbotimage command:", error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
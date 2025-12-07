const { updateUserSettings, isBotOwner } = require('../server');

module.exports = {
    pattern: 'setbotimage',
    alias: ['setimage', 'setbotpic'],
    description: 'Set bot profile image',
    category: 'customization',
    execute: async (conn, message, m, { args, reply, sessionId }) => {
        try {
            if (!isBotOwner(conn, message)) {
                return await reply('❌ Owner only command');
            }

            // Check if message has quoted image
            const quoted = m.quoted;
            if (quoted && quoted.message && quoted.message.imageMessage) {
                try {
                    // Use quoted image URL
                    const imageUrl = quoted.message.imageMessage.url;
                    
                    if (!imageUrl) {
                        return await reply('❌ Could not extract image URL from quoted message');
                    }

                    // Update user settings with new image URL
                    updateUserSettings(sessionId, { botImage: imageUrl });
                    
                    await reply(`✅ Bot image updated using quoted image!`);
                    
                    // Send confirmation with the new image
                    await conn.sendMessage(message.key.remoteJid, {
                        image: { url: imageUrl },
                        caption: `🖼️ *New Bot Image Set Successfully!*\n\nYour bot's image has been updated. This will be used in menus and other displays.`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🖼️ Bot Image Updated",
                                body: "Image set from quoted message",
                                thumbnailUrl: imageUrl,
                                sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                                mediaType: 1
                            }
                        }
                    }, { quoted: message });
                    
                    return;
                } catch (error) {
                    console.error('Error setting bot image from quoted message:', error);
                    return await reply('❌ Error updating bot image from quoted message');
                }
            }

            if (args.length === 0) {
                return await reply(
                    `🖼️ *SET BOT IMAGE*\n\nUsage:\n• .setbotimage [image URL]\n• Reply to an image with .setbotimage\n\nExample: .setbotimage https://files.catbox.moe/m3o9wj.jpg\n\nYou can also reply to an image with this command to use that image.`
                );
            }

            const imageUrl = args[0];
            
            // Check if it's a valid URL
            try {
                new URL(imageUrl);
            } catch (e) {
                return await reply('❌ Please provide a valid image URL\n\nExample: https://example.com/image.jpg');
            }

            // Check if URL points to an image (basic check)
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
            const isImageUrl = imageExtensions.some(ext => 
                imageUrl.toLowerCase().includes(ext)
            );
            
            if (!isImageUrl) {
                return await reply('❌ Please provide a valid image URL (jpg, png, gif, webp, bmp)');
            }

            // Update user settings with new image URL
            updateUserSettings(sessionId, { botImage: imageUrl });
            
            await reply(`✅ Bot image URL updated to: ${imageUrl}`);
            
            // Send confirmation with the new image
            await conn.sendMessage(message.key.remoteJid, {
                image: { url: imageUrl },
                caption: `🖼️ *New Bot Image Set Successfully!*\n\nYour bot's image has been updated to the provided URL. This will be used in menus and other displays.`,
                contextInfo: {
                    externalAdReply: {
                        title: "🖼️ Bot Image Updated",
                        body: "New image URL set successfully",
                        thumbnailUrl: imageUrl,
                        sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                        mediaType: 1
                    }
                }
            }, { quoted: message });
            
        } catch (error) {
            console.error('Error in setbotimage command:', error);
            await reply('❌ Error updating bot image: ' + error.message);
        }
    }
};
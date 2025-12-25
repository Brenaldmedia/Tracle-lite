module.exports = {
    name: 'setprefix',
    description: 'Change bot prefix',
    category: 'Settings',
    ownerOnly: true,
    
    async execute(sock, message, m, context) {
        const args = context.args || [];
        const userSettings = context.userSettings || {};
        const currentPrefix = context.userPrefix || context.PREFIX;
        
        const newPrefix = args[0];
        
        if (!newPrefix) {
            const text = `📌 *Prefix Settings*\n\n` +
                        `Current prefix: ${currentPrefix}\n\n` +
                        `Usage: ${currentPrefix}setprefix [new prefix]\n\n` +
                        `Example: ${currentPrefix}setprefix !\n\n` +
                        `Note: Prefix must be 1-3 characters.`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Prefix Settings",
                    body: `Current: ${currentPrefix}`,
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        if (newPrefix.length > 3) {
            const text = `❌ Prefix too long\n\n` +
                        `Maximum 3 characters allowed.\n` +
                        `Example: !, ., #, $, &`;
            
            return await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
                quoted: message,
                externalAdReply: {
                    title: "Invalid Prefix",
                    body: "Max 3 characters",
                    thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                    sourceUrl: context.REPO_LINK,
                    mediaType: 1
                }
            });
        }
        
        // Update prefix in the map
        context.userPrefixes.set(context.sessionId, newPrefix);
        
        const text = `✅ *Prefix Updated*\n\n` +
                    `• Old prefix: ${currentPrefix}\n` +
                    `• New prefix: ${newPrefix}\n\n` +
                    `Now use commands with ${newPrefix}\n` +
                    `Example: ${newPrefix}menu, ${newPrefix}ping`;
        
        await context.sendMessageWithContext(sock, message.key.remoteJid, text, {
            quoted: message,
            externalAdReply: {
                title: "Prefix Changed",
                body: `New prefix: ${newPrefix}`,
                thumbnailUrl: userSettings.botImage || context.MENU_IMAGE_URL,
                sourceUrl: context.REPO_LINK,
                mediaType: 1
            }
        });
    }
};
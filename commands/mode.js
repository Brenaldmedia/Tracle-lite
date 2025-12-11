module.exports = {
    pattern: "mode",
    name: "mode",
    description: "Set bot mode",
    tags: ["settings"],
    ownerOnly: true,
    
    async execute(conn, message, m, { args, q, reply, from, isGroup, isChannel, groupMetadata, sender, isAdmins, isCreator, sessionId }) {
        try {
            const server = require('../server');
            const { PREFIX, userPrefixes, updateUserSettings, MENU_IMAGE_URL, REPO_LINK } = server;
            const userSettings = server.getUserSettings(sessionId);

            const userPrefix = userPrefixes.get(sessionId) || PREFIX;

            // No args → show help menu
            if (args.length === 0) {
                const text = `🔧 *BOT MODE SETTINGS*\n\nCurrent Mode: *${userSettings.botMode}*\n\nUsage:\n• ${userPrefix}mode public - Set to public mode\n• ${userPrefix}mode private - Set to private mode\n\nPublic Mode: Bot responds to everyone\nPrivate Mode: Bot only responds to owner`;

                await reply(text, {
                    contextInfo: {
                        externalAdReply: {
                            title: "🔧 Bot Mode",
                            body: `Current: ${userSettings.botMode}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });

                return;
            }

            // Valid modes
            const newMode = args[0].toLowerCase();

            if (newMode === 'public' || newMode === 'private') {
                updateUserSettings(sessionId, { botMode: newMode });

                const text = `✅ Bot mode updated to: *${newMode}*\n\n${newMode === 'public' ? '🤖 Bot will now respond to everyone' : '🔒 Bot will only respond to the owner.'}`;

                await reply(text, {
                    contextInfo: {
                        externalAdReply: {
                            title: "🔧 Mode Updated",
                            body: `Set to ${newMode}`,
                            thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });

                return;
            }

            // Invalid input
            await reply(`❌ Invalid mode. Use 'public' or 'private'`, {
                contextInfo: {
                    externalAdReply: {
                        title: "⚠️ Invalid Mode",
                        body: "Must be public or private",
                        thumbnailUrl: userSettings.botImage || MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1
                    }
                }
            });

        } catch (error) {
            console.error("Error in mode command:", error);

            await reply(`❌ Error: ${error.message}`, {
                contextInfo: {
                    externalAdReply: {
                        title: "❌ Error",
                        body: error.message,
                        thumbnailUrl: "https://i.imgur.com/MqQvQhL.png",
                        mediaType: 1
                    }
                }
            });
        }
    }
};

const axios = require("axios");

module.exports = {
    pattern: "ttstalk",
    desc: "Fetch TikTok user profile + latest video",
    react: "📱",
    category: "search",
    filename: __filename,
    use: ".ttstalk [username]",

    execute: async (conn, message, m, { from, q }) => {

        const sendMessageWithContext = async (text, quoted = message) => {
            return await conn.sendMessage(from, {
                text,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1
                    }
                }
            }, { quoted });
        };

        try {
            if (!q) {
                return await sendMessageWithContext(
                    "❎ Please provide a TikTok username.\n\n*Example:* .ttstalk brenaldmedia"
                );
            }

            // React 📱
            await conn.sendMessage(from, {
                react: { text: module.exports.react, key: message.key }
            });

            // NEW API
            const apiUrl = `https://apis.davidcyriltech.my.id/tiktokStalk?q=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl);

            if (!data || !data.result) {
                return await sendMessageWithContext("❌ User not found or API returned no data.");
            }

            const user = data.result;
            const latestVideo = user.videos && user.videos.length > 0
                ? user.videos[0]
                : null;

            const profileInfo = `╭━━〔 *🎭 TikTok Profile* 〕━━┈⊷
┃ 👤 *Username*: @${user.username || q}
┃ 📛 *Nickname*: ${user.nickname || "Unknown"}
┃ ✅ *Verified*: ${user.verified ? "Yes ✅" : "No ❌"}
┃ 🔒 *Private*: ${user.private ? "Yes 🔒" : "No 🌍"}
┃ 📝 *Bio*: ${user.signature || "No bio available."}
┃
┃ 📊 *Statistics*:
┃ 👥 Followers: ${Number(user.followers || 0).toLocaleString()}
┃ 👤 Following: ${Number(user.following || 0).toLocaleString()}
┃ ❤️ Likes: ${Number(user.likes || 0).toLocaleString()}
┃
┃ 🆔 *ID*: ${user.user_id || "N/A"}
┃ 🔗 *Profile*: https://www.tiktok.com/@${user.username || q}
╰━━━━━━━━━━━━━━━━━━┈⊷
> © Powered by TRACLE - LITE`;

            // 1️⃣ Send profile image
            if (user.avatar) {
                await conn.sendMessage(from, {
                    image: { url: user.avatar },
                    caption: profileInfo,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363401559573199@newsletter",
                            newsletterName: "BrenaldMedia",
                            serverMessageId: -1
                        }
                    }
                }, { quoted: message });
            } else {
                await sendMessageWithContext(profileInfo);
            }

            // 2️⃣ Send latest video preview
            if (latestVideo) {
                const videoCaption = `╭━━〔 *🎬 Latest TikTok Video* 〕━━┈⊷
┃ 📝 *Caption*: ${latestVideo.desc || "No caption"}
┃ ❤️ Likes: ${Number(latestVideo.likes || 0).toLocaleString()}
┃ 💬 Comments: ${Number(latestVideo.comments || 0).toLocaleString()}
┃ 🔁 Shares: ${Number(latestVideo.shares || 0).toLocaleString()}
╰━━━━━━━━━━━━━━━━━━┈⊷`;

                // Prefer thumbnail preview (faster + safer)
                if (latestVideo.cover) {
                    await conn.sendMessage(from, {
                        image: { url: latestVideo.cover },
                        caption: videoCaption
                    }, { quoted: message });
                }
                // If no cover but video exists, send video
                else if (latestVideo.play || latestVideo.video) {
                    await conn.sendMessage(from, {
                        video: { url: latestVideo.play || latestVideo.video },
                        caption: videoCaption
                    }, { quoted: message });
                }
            } else {
                await sendMessageWithContext("ℹ️ No videos found for this user.");
            }

        } catch (error) {
            console.error("❌ Error in ttstalk:", error);
            await sendMessageWithContext(
                "⚠️ An error occurred while fetching TikTok data."
            );
        }
    }
};

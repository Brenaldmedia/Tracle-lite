const axios = require("axios");

module.exports = {
    pattern: "ttstalk",
    desc: "Fetch TikTok user profile details",
    react: "📱",
    category: "search",
    filename: __filename,
    use: ".ttstalk [username]",

    execute: async (conn, message, m, { from, q, reply, sender }) => {
        // Helper function to send messages with contextInfo
        const sendMessageWithContext = async (text, quoted = message) => {
            return await conn.sendMessage(from, {
                text: text,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: 200
                    }
                }
            }, { quoted: quoted });
        };

        try {
            if (!q) {
                return await sendMessageWithContext("❎ Please provide a TikTok username.\n\n*Example:* .ttstalk Brenaldmedia");
            }

            // React 📱
            if (module.exports.react) {
                await conn.sendMessage(from, { react: { text: module.exports.react, key: message.key } });
            }

            const apiUrl = `https://api.princetechn.com/api/stalk/tiktokstalk?apikey=prince&username=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl);

            if (!data.success || !data.result) {
                return await sendMessageWithContext("❌ User not found or API returned no data.");
            }

            const user = data.result;

            const profileInfo = `╭━━〔 *🎭 TikTok Profile* 〕━━┈⊷
┃ 👤 *Username*: @${user.username}
┃ 📛 *Nickname*: ${user.name || "Unknown"}
┃ ✅ *Verified*: ${user.verified ? "Yes ✅" : "No ❌"}
┃ 🔒 *Private*: ${user.private ? "Yes 🔒" : "No 🌍"}
┃ 📝 *Bio*: ${user.bio || "No bio available."}
┃
┃ 📊 *Statistics*:
┃ 👥 Followers: ${user.followers?.toLocaleString() || "0"}
┃ 👤 Following: ${user.following?.toLocaleString() || "0"}
┃ ❤️ Likes: ${user.likes?.toLocaleString() || "0"}
┃
┃ 🆔 *ID*: ${user.id || "N/A"}
┃ 🔗 *Profile*: https://www.tiktok.com/@${user.username}
╰━━━━━━━━━━━━━━━━━━┈⊷
> © Powered by TRACLE - LITE `;

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
                            serverMessageId: 200
                        }
                    }
                }, { quoted: message });
            } else {
                await sendMessageWithContext(profileInfo);
            }

        } catch (error) {
            console.error("❌ Error in TikTok stalk command:", error);
            await sendMessageWithContext("⚠️ An error occurred while fetching TikTok profile data.");
        }
    }
};
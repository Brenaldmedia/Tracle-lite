const axios = require("axios");

module.exports = {
    pattern: "igstalk",
    desc: "Fetch Instagram user profile details",
    react: "📸",
    category: "search",
    filename: __filename,
    use: ".igstalk [username]",

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
                    "❎ Please provide an Instagram username.\n\n*Example:* .igstalk mrbeast"
                );
            }

            // React 📸
            await conn.sendMessage(from, {
                react: { text: module.exports.react, key: message.key }
            });

            // ✅ API
            const apiUrl = `https://apis.davidcyriltech.my.id/igstalk?username=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl);

            if (!data || !data.result) {
                return await sendMessageWithContext("❌ User not found or API returned no data.");
            }

            const user = data.result;

            const profileInfo = `╭━━〔 *📸 Instagram Profile* 〕━━┈⊷
┃ 👤 *Username*: @${user.username || q}
┃ 📛 *Full Name*: ${user.full_name || "Unknown"}
┃ 🔒 *Private*: ${user.is_private ? "Yes 🔒" : "No 🌍"}
┃ ✅ *Verified*: ${user.is_verified ? "Yes ✅" : "No ❌"}
┃ 📝 *Bio*: ${user.biography || "No bio available."}
┃ 🔗 *Website*: ${user.external_url || "N/A"}
┃
┃ 📊 *Statistics*:
┃ 👥 Followers: ${Number(user.followers || 0).toLocaleString()}
┃ 👤 Following: ${Number(user.following || 0).toLocaleString()}
┃ 🖼️ Posts: ${Number(user.posts || 0).toLocaleString()}
┃
┃ 🆔 *ID*: ${user.id || "N/A"}
┃ 🔗 *Profile*: https://www.instagram.com/${user.username || q}
╰━━━━━━━━━━━━━━━━━━┈⊷
> © Powered by TRACLE - LITE`;

            if (user.profile_pic) {
                await conn.sendMessage(from, {
                    image: { url: user.profile_pic },
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

        } catch (error) {
            console.error("❌ Error in igstalk:", error);
            await sendMessageWithContext(
                "⚠️ An error occurred while fetching Instagram profile data."
            );
        }
    }
};

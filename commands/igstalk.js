const axios = require("axios");

module.exports = {
    pattern: "igstalk",
    alias: ["instagramstalk", "igstalker"],
    category: "stalker",
    description: "Stalk Instagram profile information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📸 *Instagram Stalk*\n\nUsage: .igstalk [username]\nExample: .igstalk Brenaldmedia\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
            await reply(`🔍 Stalking Instagram user *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/instagram?user=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ User "${q}" not found.\n\nMake sure the username is correct.\n> Powered by Tracle-Lite`);
            }

            const user = response.data.result;
            
            let message = `📸 *INSTAGRAM STALK* 📸\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `👤 *Username:* @${user.username || q}\n`;
            message += `📛 *Full Name:* ${user.full_name || 'N/A'}\n`;
            message += `📝 *Bio:* ${user.bio || 'No bio'}\n`;
            message += `👥 *Followers:* ${user.follower_count?.toLocaleString() || 0}\n`;
            message += `👣 *Following:* ${user.following_count?.toLocaleString() || 0}\n`;
            message += `📸 *Posts:* ${user.media_count?.toLocaleString() || 0}\n`;
            message += `🔗 *Profile:* https://instagram.com/${user.username || q}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            
            if (user.profile_pic_url) {
                try {
                    await conn.sendMessage(from, { image: { url: user.profile_pic_url }, caption: `📸 @${user.username || q}` }, { quoted: mek });
                } catch (e) {}
            }
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Instagram Stalk error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
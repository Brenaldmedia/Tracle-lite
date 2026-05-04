const axios = require("axios");

module.exports = {
    pattern: "ttstalk",
    alias: ["tiktokstalk", "ttstalker"],
    category: "stalker",
    description: "Stalk TikTok profile information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📱 *TikTok Stalk*\n\nUsage: .ttstalk [username]\nExample: .ttstalk Brenaldmedia\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
            await reply(`🔍 Stalking TikTok user *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/tiktok?user=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ User "${q}" not found.\n\nMake sure the username is correct.\n> Powered by Tracle-Lite`);
            }

            const user = response.data.result;
            
            let message = `📱 *TIKTOK STALK* 📱\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `👤 *Username:* @${user.uniqueId || user.username || q}\n`;
            message += `📛 *Nickname:* ${user.nickname || 'N/A'}\n`;
            message += `📝 *Bio:* ${user.signature || 'No bio'}\n`;
            message += `👥 *Followers:* ${user.followerCount?.toLocaleString() || 0}\n`;
            message += `👣 *Following:* ${user.followingCount?.toLocaleString() || 0}\n`;
            message += `❤️ *Hearts:* ${user.heartCount?.toLocaleString() || 0}\n`;
            message += `🎬 *Videos:* ${user.videoCount?.toLocaleString() || 0}\n`;
            message += `🔗 *Profile:* https://tiktok.com/@${user.uniqueId || q}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            
            if (user.avatarThumb) {
                try {
                    await conn.sendMessage(from, { image: { url: user.avatarThumb }, caption: `📸 @${user.uniqueId || q}` }, { quoted: mek });
                } catch (e) {}
            }
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("TikTok Stalk error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
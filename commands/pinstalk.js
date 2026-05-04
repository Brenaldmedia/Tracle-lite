const axios = require("axios");

module.exports = {
    pattern: "pinstalk",
    alias: ["pintereststalk", "pinstalker"],
    category: "stalker",
    description: "Stalk Pinterest profile information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📌 *Pinterest Stalk*\n\nUsage: .pinstalk [username]\nExample: .pinstalk pinterest\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
            await reply(`🔍 Stalking Pinterest user *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/pinterest?user=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ User "${q}" not found.\n> Powered by Tracle-Lite`);
            }

            const user = response.data.result;
            
            let message = `📌 *PINTEREST STALK* 📌\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `👤 *Username:* ${user.username || q}\n`;
            message += `📛 *Name:* ${user.full_name || 'N/A'}\n`;
            message += `📝 *Bio:* ${user.bio || 'No bio'}\n`;
            message += `👥 *Followers:* ${user.follower_count?.toLocaleString() || 0}\n`;
            message += `👣 *Following:* ${user.following_count?.toLocaleString() || 0}\n`;
            message += `📌 *Pins:* ${user.pin_count?.toLocaleString() || 0}\n`;
            message += `🔗 *Profile:* https://pinterest.com/${user.username || q}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            
            if (user.profile_image) {
                try {
                    await conn.sendMessage(from, { image: { url: user.profile_image }, caption: `📌 @${user.username || q}` }, { quoted: mek });
                } catch (e) {}
            }
            
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Pinterest Stalk error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
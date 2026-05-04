const axios = require("axios");

module.exports = {
    pattern: "npmstalk",
    alias: ["npm", "packagestalk"],
    category: "stalker",
    description: "Stalk NPM package information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`📦 *NPM Package Stalk*\n\nUsage: .npmstalk [package name]\nExample: .npmstalk axios\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "📦", key: mek.key } });
            await reply(`🔍 Looking up NPM package *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/npm?package=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Package "${q}" not found.\n> Powered by Tracle-Lite`);
            }

            const pkg = response.data.result;
            
            let message = `📦 *NPM PACKAGE STALK* 📦\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `📛 *Name:* ${pkg.name || q}\n`;
            message += `📝 *Description:* ${pkg.description || 'No description'}\n`;
            message += `⬇️ *Downloads (weekly):* ${pkg.weeklyDownloads?.toLocaleString() || 'N/A'}\n`;
            message += `⭐ *Version:* ${pkg.version || 'N/A'}\n`;
            message += `📅 *Published:* ${pkg.published ? new Date(pkg.published).toLocaleDateString() : 'N/A'}\n`;
            message += `🔗 *URL:* ${pkg.url || `https://npmjs.com/package/${q}`}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("NPM Stalk error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
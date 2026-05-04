const axios = require("axios");

module.exports = {
    pattern: "githubstalk",
    alias: ["ghstalk", "githubrepo"],
    category: "stalker",
    description: "Stalk GitHub repository/profile information",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🐙 *GitHub Stalk*\n\nUsage: .githubstalk [username/repo]\nExample: .githubstalk brenaldmedia/Tracle\n\n> Powered by Tracle-Lite`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
            await reply(`🔍 Searching GitHub *${q}*...`);

            const response = await axios.get(`https://apiskeith.top/stalker/github?repo=${encodeURIComponent(q)}`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Repository "${q}" not found.\n> Powered by Tracle-Lite`);
            }

            const repo = response.data.result;
            
            let message = `🐙 *GITHUB REPO STALK* 🐙\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `📛 *Name:* ${repo.name || q}\n`;
            message += `👤 *Owner:* ${repo.owner?.login || 'N/A'}\n`;
            message += `📝 *Description:* ${repo.description || 'No description'}\n`;
            message += `⭐ *Stars:* ${repo.stargazers_count?.toLocaleString() || 0}\n`;
            message += `🍴 *Forks:* ${repo.forks_count?.toLocaleString() || 0}\n`;
            message += `👀 *Watchers:* ${repo.watchers_count?.toLocaleString() || 0}\n`;
            message += `⚠️ *Issues:* ${repo.open_issues_count || 0}\n`;
            message += `📅 *Created:* ${repo.created_at ? new Date(repo.created_at).toLocaleDateString() : 'N/A'}\n`;
            message += `🔄 *Updated:* ${repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'N/A'}\n`;
            message += `🔗 *URL:* ${repo.html_url || 'N/A'}\n`;
            message += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("GitHub Stalk error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
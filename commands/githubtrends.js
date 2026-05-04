const axios = require("axios");

module.exports = {
    pattern: "githubtrends",
    alias: ["ghtrends", "trending"],
    category: "stalker",
    description: "Get GitHub trending repositories",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            await conn.sendMessage(from, { react: { text: "📈", key: mek.key } });
            await reply(`📈 Fetching GitHub trending repositories...`);

            const response = await axios.get(`https://apiskeith.top/stalker/github-trends`, { timeout: 15000 });

            if (!response.data?.status) {
                return reply(`❌ Could not fetch GitHub trends.\n> Powered by Tracle-Lite`);
            }

            const repos = response.data.result || [];
            let message = `📈 *GITHUB TRENDING* 📈\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            repos.slice(0, 10).forEach((repo, index) => {
                message += `${index + 1}. *${repo.name || repo.repository}*\n`;
                message += `   ⭐ ${repo.stars || repo.stargazers || 0} stars\n`;
                if (repo.description) message += `   📝 ${repo.description.substring(0, 80)}...\n`;
                message += `\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━━━━━\n⚡ Powered by Tracle-Lite`;

            await conn.sendMessage(from, { text: message }, { quoted: mek });
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("GitHub Trends error:", error.message);
            await reply(`❌ Failed: ${error.message.substring(0, 100)}\n> Powered by Tracle-Lite`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
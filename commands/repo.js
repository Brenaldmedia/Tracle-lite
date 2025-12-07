const axios = require("axios");

module.exports = {
    pattern: "repo",
    desc: "Get GitHub repository information",
    category: "info",
    filename: __filename,
    use: ".repo",

    execute: async (conn, mek, m, { from, reply }) => {
        try {
            // Send loading reaction
            await conn.sendMessage(from, { 
                react: { text: "📂", key: mek.key } 
            });

            // GitHub API endpoint for the repository
            const apiUrl = "https://api.github.com/repos/Brenaldmedia/Tracle";
            
            const { data } = await axios.get(apiUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'TRACLE-Bot'
                }
            });

            // Format dates
            const createdDate = new Date(data.created_at).toLocaleDateString();
            const updatedDate = new Date(data.updated_at).toLocaleDateString();

            // Create the repository info message
            const repoInfo = `
┏━━━📂 *GitHub Repository Info* ━━━┓

🔗 *Repo:* ${data.html_url}
📛 *Name:* ${data.full_name}
⭐ *Stars:* ${data.stargazers_count}
🍴 *Forks:* ${data.forks_count}
👀 *Watchers:* ${data.watchers_count}
❗ *Open Issues:* ${data.open_issues_count}
📅 *Created:* ${createdDate}
📝 *Updated:* ${updatedDate}

⚡ *Description:*
${data.description || "No description available"}

━━━━━━━━━━━━━━━━━━━━━━
📌 *Menu Options*
1️⃣ View Repo → ${data.html_url}
2️⃣ Star Repo → ${data.html_url}/stargazers
3️⃣ Fork Repo → ${data.html_url}/fork
4️⃣ Download ZIP → ${data.html_url}/archive/refs/heads/main.zip
━━━━━━━━━━━━━━━━━━━━━━
> 📂 Powered by BrenaldMedia
            `.trim();

            await conn.sendMessage(from, {
                text: repoInfo
            }, { quoted: mek });

        } catch (error) {
            console.error("❌ Error in repo command:", error);
            await conn.sendMessage(from, { 
                react: { text: "❌", key: mek.key } 
            });
            
            // Fallback message if API fails
            const fallbackMessage = `
┏━━━📂 *GitHub Repository Info* ━━━┓

🔗 *Repo:* https://github.com/Brenaldmedia/Tracle
📛 *Name:* Brenaldmedia/Tracle
⭐ *Stars:* 2
🍴 *Forks:* 3
👀 *Watchers:* 2
❗ *Open Issues:* 0
📅 *Created:* 8/23/2024
📝 *Updated:* 9/11/2024

⚡ *Description:*
A Multidevice WhatsApp Bot Made By BrenaldMedia

━━━━━━━━━━━━━━━━━━━━━━
📌 *Menu Options*
1️⃣ View Repo → https://github.com/Brenaldmedia/Tracle
2️⃣ Star Repo → https://github.com/Brenaldmedia/Tracle/stargazers
3️⃣ Fork Repo → https://github.com/Brenaldmedia/Tracle/fork
4️⃣ Download ZIP → https://github.com/Brenaldmedia/Tracle/archive/refs/heads/main.zip
━━━━━━━━━━━━━━━━━━━━━━
> 📂 Powered by BrenaldMedia
            `.trim();

            reply(fallbackMessage);
        }
    }
};
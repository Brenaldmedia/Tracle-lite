const fs = require('fs');
const path = require('path');

module.exports = {
    pattern: "listprem",
    desc: "List all premium users (Owner only)",
    category: "owner",
    react: "⭐",
    filename: __filename,
    ownerOnly: true,

    execute: async (conn, message, m, { reply }) => {
        try {
            const premiumPath = path.join(__dirname, '../data/premium.json');
            
            if (!fs.existsSync(premiumPath)) {
                return reply("📋 No premium users yet.");
            }

            const data = JSON.parse(fs.readFileSync(premiumPath, 'utf8'));
            const users = data.users || [];

            if (users.length === 0) {
                return reply("📋 No premium users found.");
            }

            let text = `⭐ *PREMIUM USERS* (${users.length})\n\n`;
            
            users.forEach((num, index) => {
                text += `• ${num}\n`;
            });

            text += `\nTotal Premium Users: ${users.length}`;

            await reply(text);

        } catch (error) {
            console.error("listprem error:", error);
            await reply("❌ Error fetching premium list.");
        }
    }
};
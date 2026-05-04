const axios = require("axios");

module.exports = {
    pattern: "groupsearch",
    alias: ["whatsappgroup", "wg", "findgroup", "groups"],
    category: "search",
    description: "Search for WhatsApp group links",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`👥 *WhatsApp Group Search*\n\nUsage: .groupsearch [topic]\nExample: .groupsearch football\n\nOther examples:\n• .groupsearch coding\n• .groupsearch music\n• .groupsearch anime\n\n> ⚡ Powered by TRACLE-LITE`);
            }

            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

            console.log(`\n🔍 Searching WhatsApp groups for: "${q}"`);
            await reply(`🔍 Searching for *${q}* WhatsApp groups...`);

            // Call Keith API
            const apiUrl = `https://apiskeith.top/search/whatsappgroup?q=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });

            console.log(`📦 API Response success: ${response.data?.success}`);

            if (!response.data?.success || !response.data?.results || response.data.results.length === 0) {
                return reply(`❌ No WhatsApp groups found for "${q}"\n\nTry a different search term.\n> ⚡ Powered by TRACLE-LITE`);
            }

            const results = response.data.results;
            const total = response.data.total || results.length;
            
            console.log(`✅ Found ${total} group categories`);

            // Limit to first 10 results to avoid spam
            const displayResults = results.slice(0, 10);
            
            // Create formatted message
            let message = `👥 *WhatsApp Group Search Results*\n\n`;
            message += `🔍 *Query:* ${q}\n`;
            message += `📊 *Found:* ${total} group categories\n`;
            message += `📌 *Showing:* ${displayResults.length} results\n\n`;
            message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            displayResults.forEach((result, index) => {
                const groupUrl = result.url;
                // Extract actual WhatsApp invite link from the page URL
                // The API returns category pages, not direct invite links
                message += `${index + 1}. *${result.title}*\n`;
                message += `   🔗 ${groupUrl}\n`;
                message += `   ℹ️ Click the link to find working group invites\n\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `💡 *How to join:*\n`;
            message += `1. Click on any link above\n`;
            message += `2. Look for "Join" buttons on the page\n`;
            message += `3. Click to join the WhatsApp group\n\n`;
            message += `⚠️ *Note:* Some groups may be full or expired\n\n`;
            message += `> ⚡ Powered by TRACLE-LITE`;

            // Send the results
            await conn.sendMessage(from, {
                text: message,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    externalAdReply: {
                        title: `WhatsApp Groups: ${q}`,
                        body: `${total} groups found`,
                        thumbnailUrl: "https://i.imgur.com/8Km9tLL.png",
                        mediaType: 1
                    }
                }
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            console.log(`✅ Group search results sent!\n`);

        } catch (error) {
            console.error("\n❌ Error details:", error.message);
            if (error.response) console.error("Response status:", error.response.status);
            
            await reply(`❌ Failed to search groups.\nError: ${error.message.substring(0, 100)}\n\nTry again later.\n> ⚡ Powered by TRACLE-LITE`);
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
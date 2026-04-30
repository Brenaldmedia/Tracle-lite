const axios = require("axios");

module.exports = {
  pattern: "hackernews",
  alias: ["hn", "hacknews", "news"],
  desc: "Search Hacker News stories",
  category: "search",
  react: "📰",
  filename: __filename,
  use: "<search query>",

  execute: async (conn, message, m, { from, reply, args }) => {
    let searchQuery;
    try {
      searchQuery = args.join(" ");
      if (!searchQuery) {
        return reply(`📰 *Hacker News Search*

Search Hacker News stories, articles, and discussions!

📝 *Usage:*
.hackernews artificial intelligence
.hn blockchain
.news programming

💡 *Examples:*
.hackernews ChatGPT
.hn machine learning
.news startup

📌 *Options:*
• Add limit: .hackernews AI limit:10
• Get top stories with .hntop

🔍 Just type .hackernews followed by your search!`);
      }

      // Check if user specified a limit
      let limit = 5;
      if (searchQuery.includes(" limit:")) {
        const parts = searchQuery.split(" limit:");
        searchQuery = parts[0].trim();
        limit = parseInt(parts[1]) || 5;
        if (limit > 10) limit = 10; // Max 10 results
      }

      await reply(`📰 *Searching Hacker News...*\n\n🔍 Query: ${searchQuery}\n📊 Limit: ${limit}\n⏳ Please wait...`);

      // Silvatech Hacker News Search API
      const apiUrl = `https://api.silvatech.co.ke/search/hackernews?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;

      console.log(`📡 Calling HackerNews API: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      console.log(`📦 API Response status: ${response.status}`);

      // Check if we got results
      if (response.data && response.data.status === true && response.data.result && response.data.result.stories) {
        const result = response.data.result;
        const stories = result.stories;
        
        let resultText = `📰 *HACKER NEWS SEARCH RESULTS*\n\n`;
        resultText += `🔍 *Query:* ${result.query}\n`;
        resultText += `📊 *Total Found:* ${result.total.toLocaleString()} stories\n`;
        resultText += `📋 *Showing:* ${result.count} results\n`;
        resultText += `👨‍💻 *Creator:* ${response.data.creator || '@SilvaTechB'}\n\n`;
        resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        stories.forEach((story, index) => {
          // Format date
          const createdDate = new Date(story.created);
          const formattedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          resultText += `📌 *${index + 1}. ${story.title}*\n\n`;
          resultText += `   👤 *Author:* ${story.author}\n`;
          resultText += `   ⭐ *Points:* ${story.points.toLocaleString()}\n`;
          resultText += `   💬 *Comments:* ${story.comments.toLocaleString()}\n`;
          resultText += `   📅 *Posted:* ${formattedDate}\n`;
          resultText += `   🔗 *HN Link:* ${story.hn_url}\n`;
          if (story.url && !story.url.includes('facebook.com')) {
            resultText += `   🌐 *Source:* ${story.url.length > 50 ? story.url.substring(0, 50) + '...' : story.url}\n`;
          }
          resultText += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        });

        resultText += `💡 *Tips:*\n`;
        resultText += `• Use .hackernews ${searchQuery} limit:10 for more results\n`;
        resultText += `• Visit the HN link to join discussions\n`;
        resultText += `• Use .hntop to see top stories\n`;
        resultText += `• Use .hnnew for latest stories`;

        // Send the results
        await reply(resultText);

      } else {
        await reply(`❌ *No stories found!*\n\n🔍 Query: ${searchQuery}\n\n💡 Try:\n• Different keywords\n• Shorter search term\n• .hackernews programming\n• .hackernews AI\n\n📌 Make sure your query isn't too specific`);
      }

      // Send reaction
      await conn.sendMessage(from, {
        react: { text: "✅", key: message.key }
      }).catch(() => {});

    } catch (error) {
      console.error("❌ HackerNews Search Error:", error.message);
      
      let errorMsg = error.message;
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timeout. Please try again.';
      } else if (error.response?.status === 404) {
        errorMsg = 'API endpoint not found.';
      } else if (error.response?.status === 429) {
        errorMsg = 'Too many requests. Please wait.';
      } else if (error.response?.status === 500) {
        errorMsg = 'Server error. Please try again later.';
      }
      
      const queryText = searchQuery || args.join(" ") || "unknown";
      
      await reply(`❌ *HackerNews Search Error*\n\n🔍 Query: ${queryText}\n⚠️ ${errorMsg}\n\n💡 Try:\n• Different search terms\n• Check your spelling\n• Try again later`);
      
      await conn.sendMessage(from, {
        react: { text: "❌", key: message.key }
      }).catch(() => {});
    }
  }
};
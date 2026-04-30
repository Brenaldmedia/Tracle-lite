const axios = require("axios");

module.exports = {
  pattern: "anime",
  alias: ["ani", "searchanime", "animesearch"],
  desc: "Search for anime",
  category: "search",
  react: "🎬",
  filename: __filename,
  use: "<anime title>",

  execute: async (conn, message, m, { from, reply, args }) => {
    let searchQuery;
    try {
      searchQuery = args.join(" ");
      if (!searchQuery) {
        return reply(`🎬 *Anime Search*

Search for anime information, ratings, and details!

📝 *Usage:*
.anime Naruto
.anime One Piece
.anime Attack on Titan

💡 *Examples:*
.anime Demon Slayer
.anime Jujutsu Kaisen
.anime Death Note

📌 *Options:*
• Add limit: .anime Naruto limit:10
• Get detailed info about specific anime

🔍 Just type .anime followed by the anime title!`);
      }

      // Check if user specified a limit
      let limit = 5;
      if (searchQuery.includes(" limit:")) {
        const parts = searchQuery.split(" limit:");
        searchQuery = parts[0].trim();
        limit = parseInt(parts[1]) || 5;
        if (limit > 10) limit = 10; // Max 10 results
      }

      await reply(`🎬 *Searching for anime...*\n\n🔍 Query: ${searchQuery}\n📊 Limit: ${limit}\n⏳ Please wait...`);

      // Silvatech Anime Search API
      const apiUrl = `https://api.silvatech.co.ke/search/anime?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;

      console.log(`📡 Calling Anime API: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      console.log(`📦 API Response status: ${response.status}`);

      // Check if we got results
      if (response.data && response.data.status === true && response.data.result && response.data.result.length > 0) {
        const results = response.data.result;
        
        let resultText = `🎬 *ANIME SEARCH RESULTS*\n\n`;
        resultText += `🔍 *Query:* ${searchQuery}\n`;
        resultText += `📊 *Found:* ${results.length} anime\n`;
        resultText += `👨‍💻 *Creator:* ${response.data.creator || '@SilvaTechB'}\n\n`;
        resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        results.forEach((anime, index) => {
          resultText += `🎯 *${index + 1}. ${anime.title}*\n`;
          if (anime.title_english && anime.title_english !== anime.title) {
            resultText += `   📝 *English:* ${anime.title_english}\n`;
          }
          resultText += `   📺 *Type:* ${anime.type}\n`;
          resultText += `   📊 *Episodes:* ${anime.episodes}\n`;
          resultText += `   ⚡ *Status:* ${anime.status}\n`;
          resultText += `   ⭐ *Score:* ${anime.score}/10\n`;
          resultText += `   🏆 *Rank:* #${anime.rank}\n`;
          resultText += `   📅 *Aired:* ${anime.aired}\n`;
          resultText += `   🎭 *Genres:* ${anime.genres.join(', ')}\n\n`;
          resultText += `   📖 *Synopsis:* ${anime.synopsis.substring(0, 200)}${anime.synopsis.length > 200 ? '...' : ''}\n\n`;
          resultText += `   🔗 *MAL Link:* ${anime.url}\n`;
          resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        });

        resultText += `💡 *Tips:*\n`;
        resultText += `• Use .anime ${searchQuery} limit:10 for more results\n`;
        resultText += `• Visit MyAnimeList for full details\n`;
        resultText += `• Use .animeinfo <id> for detailed info about a specific anime`;

        // Send the results
        await reply(resultText);

        // Also send the first anime's image if available
        if (results[0] && results[0].image) {
          try {
            await conn.sendMessage(from, {
              image: { url: results[0].image },
              caption: `🎬 *${results[0].title}*\n⭐ Score: ${results[0].score}/10\n🏆 Rank: #${results[0].rank}\n\n📺 ${results[0].type} • ${results[0].episodes} episodes\n⚡ ${results[0].status}`
            }, { quoted: message });
          } catch (imgError) {
            console.log("Could not send image:", imgError.message);
          }
        }

      } else {
        await reply(`❌ *No anime found!*\n\n🔍 Query: ${searchQuery}\n\n💡 Try:\n• Different spelling\n• Shorter title\n• .anime Naruto\n• .anime One Piece\n\n📌 Make sure the anime exists on MyAnimeList`);
      }

      // Send reaction
      await conn.sendMessage(from, {
        react: { text: "✅", key: message.key }
      }).catch(() => {});

    } catch (error) {
      console.error("❌ Anime Search Error:", error.message);
      
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
      
      await reply(`❌ *Anime Search Error*\n\n🔍 Query: ${queryText}\n⚠️ ${errorMsg}\n\n💡 Try:\n• Different anime title\n• Check spelling\n• Try again later`);
      
      await conn.sendMessage(from, {
        react: { text: "❌", key: message.key }
      }).catch(() => {});
    }
  }
};
const axios = require("axios");

module.exports = {
  pattern: "livescores",
  alias: ["scores", "live", "sports", "matches"],
  desc: "Get live sports scores across all major sports (NBA, NFL, MLB, NHL, Soccer)",
  category: "sports",
  react: "⚽",
  filename: __filename,
  use: "[sport]",

  execute: async (conn, message, m, { from, reply, args }) => {
    try {
      const sportFilter = args[0] ? args[0].toLowerCase() : null;
      
      await reply(`⚽ *Fetching live scores...*\n⏳ Please wait...`);

      // Silvatech Live Scores API
      const apiUrl = `https://api.silvatech.co.ke/sports/livescores`;

      console.log(`📡 Calling Live Scores API: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      console.log(`📦 API Response status: ${response.status}`);

      if (response.data && response.data.status === true && response.data.result) {
        const result = response.data.result;
        
        let resultText = `⚽ *LIVE SPORTS SCORES*\n\n`;
        resultText += `📅 *Date:* ${new Date().toLocaleDateString()}\n`;
        resultText += `🕐 *Time:* ${new Date().toLocaleTimeString()}\n`;
        resultText += `⚡ *Powered by:* Tracle-Lite\n\n`;
        resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        let hasData = false;

        // Soccer/Football
        if ((!sportFilter || sportFilter === 'soccer' || sportFilter === 'football') && result.soccer && result.soccer.events && result.soccer.events.length > 0) {
          hasData = true;
          resultText += `⚽ *SOCCER/FOOTBALL*\n`;
          resultText += `📊 ${result.soccer.count} matches\n\n`;
          
          result.soccer.events.forEach((event, idx) => {
            const statusIcon = event.completed ? "✅" : (event.status === "Scheduled" ? "📅" : "🟢");
            resultText += `${statusIcon} *${event.name}*\n`;
            resultText += `   🏠 ${event.home.team}: ${event.home.score}\n`;
            resultText += `   ✈️ ${event.away.team}: ${event.away.score}\n`;
            resultText += `   ⏰ ${event.status} • ${event.clock}\n`;
            resultText += `   🏟️ ${event.venue}\n\n`;
          });
          resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }

        // NBA Basketball
        if ((!sportFilter || sportFilter === 'nba' || sportFilter === 'basketball') && result.nba && result.nba.events && result.nba.events.length > 0) {
          hasData = true;
          resultText += `🏀 *NBA BASKETBALL*\n`;
          resultText += `📊 ${result.nba.count} games\n\n`;
          
          result.nba.events.forEach((event, idx) => {
            const statusIcon = event.completed ? "✅" : (event.status === "Scheduled" ? "📅" : "🟢");
            resultText += `${statusIcon} *${event.name}*\n`;
            resultText += `   🏠 ${event.home.team}: ${event.home.score}\n`;
            resultText += `   ✈️ ${event.away.team}: ${event.away.score}\n`;
            resultText += `   ⏰ ${event.status} • Period ${event.period}\n`;
            resultText += `   🏟️ ${event.venue}\n\n`;
          });
          resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }

        // NFL Football
        if ((!sportFilter || sportFilter === 'nfl' || sportFilter === 'football') && result.nfl && result.nfl.events && result.nfl.events.length > 0) {
          hasData = true;
          resultText += `🏈 *NFL FOOTBALL*\n`;
          resultText += `📊 ${result.nfl.count} games\n\n`;
          
          result.nfl.events.forEach((event, idx) => {
            const statusIcon = event.completed ? "✅" : (event.status === "Scheduled" ? "📅" : "🟢");
            resultText += `${statusIcon} *${event.name}*\n`;
            resultText += `   🏠 ${event.home.team}: ${event.home.score}\n`;
            resultText += `   ✈️ ${event.away.team}: ${event.away.score}\n`;
            resultText += `   ⏰ ${event.status} • ${event.clock}\n`;
            resultText += `   🏟️ ${event.venue}\n\n`;
          });
          resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }

        // MLB Baseball
        if ((!sportFilter || sportFilter === 'mlb' || sportFilter === 'baseball') && result.mlb && result.mlb.events && result.mlb.events.length > 0) {
          hasData = true;
          resultText += `⚾ *MLB BASEBALL*\n`;
          resultText += `📊 ${result.mlb.count} games\n\n`;
          
          result.mlb.events.forEach((event, idx) => {
            const statusIcon = event.completed ? "✅" : (event.status === "Postponed" ? "⏸️" : (event.status === "Scheduled" ? "📅" : "🟢"));
            resultText += `${statusIcon} *${event.name}*\n`;
            resultText += `   🏠 ${event.home.team}: ${event.home.score}\n`;
            resultText += `   ✈️ ${event.away.team}: ${event.away.score}\n`;
            resultText += `   ⏰ ${event.status} • Inning ${event.period}\n`;
            resultText += `   🏟️ ${event.venue}\n\n`;
          });
          resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }

        // NHL Hockey
        if ((!sportFilter || sportFilter === 'nhl' || sportFilter === 'hockey') && result.nhl && result.nhl.events && result.nhl.events.length > 0) {
          hasData = true;
          resultText += `🏒 *NHL HOCKEY*\n`;
          resultText += `📊 ${result.nhl.count} games\n\n`;
          
          result.nhl.events.forEach((event, idx) => {
            const statusIcon = event.completed ? "✅" : (event.status === "Scheduled" ? "📅" : "🟢");
            resultText += `${statusIcon} *${event.name}*\n`;
            resultText += `   🏠 ${event.home.team}: ${event.home.score}\n`;
            resultText += `   ✈️ ${event.away.team}: ${event.away.score}\n`;
            resultText += `   ⏰ ${event.status} • Period ${event.period}\n`;
            resultText += `   🏟️ ${event.venue}\n\n`;
          });
          resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }

        if (!hasData) {
          resultText += `❌ *No live scores available*\n\n`;
          resultText += `💡 *Try:*\n`;
          resultText += `• .livescores nba\n`;
          resultText += `• .livescores soccer\n`;
          resultText += `• .livescores nfl\n`;
          resultText += `• .livescores mlb\n`;
          resultText += `• .livescores nhl\n\n`;
        }

        resultText += `💡 *Filter by sport:*\n`;
        resultText += `• .livescores nba\n`;
        resultText += `• .livescores soccer\n`;
        resultText += `• .livescores nfl\n`;
        resultText += `• .livescores mlb\n`;
        resultText += `• .livescores nhl\n\n`;
        resultText += `⚡ Powered by Tracle-Lite`;

        // Split message if too long (WhatsApp limit ~4096 chars)
        if (resultText.length > 4000) {
          const parts = resultText.match(/[\s\S]{1,4000}/g) || [];
          for (const part of parts) {
            await reply(part);
          }
        } else {
          await reply(resultText);
        }

      } else {
        await reply(`❌ *Unable to fetch live scores*\n\n⚠️ The sports service may be temporarily unavailable.\n\n💡 Try again later.\n\n⚡ Powered by Tracle-Lite`);
      }

      // Send reaction
      await conn.sendMessage(from, {
        react: { text: "✅", key: message.key }
      }).catch(() => {});

    } catch (error) {
      console.error("❌ Live Scores Error:", error.message);
      
      let errorMsg = error.message;
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timeout. Please try again.';
      } else if (error.response?.status === 404) {
        errorMsg = 'Sports service temporarily unavailable.';
      } else if (error.response?.status === 429) {
        errorMsg = 'Too many requests. Please wait.';
      }
      
      await reply(`❌ *Live Scores Error*\n\n⚠️ ${errorMsg}\n\n💡 Try again later\n\n⚡ Powered by Tracle-Lite`);
      
      await conn.sendMessage(from, {
        react: { text: "❌", key: message.key }
      }).catch(() => {});
    }
  }
};
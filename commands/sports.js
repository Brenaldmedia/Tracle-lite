const axios = require("axios");

module.exports = {
  pattern: "sports",
  alias: ["sport", "allsports", "sportslist"],
  desc: "View all available sports with descriptions and icons",
  category: "sports",
  react: "🏆",
  filename: __filename,
  use: "[sport name]",

  execute: async (conn, message, m, { from, reply, args, userSettings, BOT_NAME, MENU_IMAGE_URL, REPO_LINK }) => {
    try {
      const sportQuery = args.join(" ") || null;
      
      await reply(`🏆 *Fetching sports data...*\n⏳ Please wait...`);

      // Silvatech All Sports API
      const apiUrl = `https://api.silvatech.co.ke/sports/all`;

      console.log(`📡 Calling Sports API: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      console.log(`📦 API Response status: ${response.status}`);

      if (response.data && response.data.status === true && response.data.result && response.data.result.sports) {
        const sports = response.data.result.sports;
        
        // If searching for specific sport
        if (sportQuery) {
          const foundSport = sports.find(s => 
            s.strSport.toLowerCase().includes(sportQuery.toLowerCase())
          );
          
          if (foundSport) {
            // Detailed view for specific sport
            const detailText = `🏆 *${foundSport.strSport.toUpperCase()}*\n\n` +
              `📋 *Format:* ${foundSport.strFormat}\n\n` +
              `📖 *Description:*\n${foundSport.strSportDescription || 'No description available'}\n\n` +
              `⚡ Powered by Tracle-Lite`;
            
            // Send with image if available
            if (foundSport.strSportThumb) {
              await conn.sendMessage(from, {
                image: { url: foundSport.strSportThumb },
                caption: detailText,
                contextInfo: {
                  forwardingScore: 1,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363401559573199@newsletter",
                    newsletterName: "BrenaldMedia",
                    serverMessageId: -1,
                  },
                  externalAdReply: {
                    title: `${foundSport.strSport}`,
                    body: "Sport Information",
                    thumbnailUrl: MENU_IMAGE_URL,
                    sourceUrl: REPO_LINK,
                    mediaType: 1
                  }
                }
              }, { quoted: message });
            } else {
              await reply(detailText);
            }
            return;
          } else {
            await reply(`❌ *Sport not found:* "${sportQuery}"\n\n💡 Try: .sports to see all available sports\n\n⚡ Powered by Tracle-Lite`);
            return;
          }
        }
        
        // Generate menu-style sports list
        let menuText = `🏆 *SPORTS DIRECTORY*\n\n`;
        menuText += `📊 *Total Sports:* ${sports.length}\n`;
        menuText += `⚡ *Powered by:* Tracle-Lite\n\n`;
        menuText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        // Display sports in cool grid/card style
        sports.forEach((sport, index) => {
          const number = (index + 1).toString().padStart(2, '0');
          menuText += `🎯 *${number}. ${sport.strSport}*\n`;
          menuText += `   📋 ${sport.strFormat}\n`;
          menuText += `   🔍 .sports ${sport.strSport.toLowerCase()}\n\n`;
        });
        
        menuText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        menuText += `💡 *How to use:*\n`;
        menuText += `• .sports - Show all sports\n`;
        menuText += `• .sports soccer - View soccer details\n`;
        menuText += `• .livescores - Get live scores\n`;
        menuText += `• .teams - Search teams\n`;
        menuText += `• .players - Search players\n\n`;
        menuText += `⚡ Powered by Tracle-Lite`;
        
        // Send as video/GIF style with external ad reply
        await conn.sendMessage(from, {
          text: menuText,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363401559573199@newsletter",
              newsletterName: "BrenaldMedia",
              serverMessageId: -1,
            },
            externalAdReply: {
              title: `${userSettings.botName || BOT_NAME} Sports Hub`,
              body: `${sports.length} sports available`,
              thumbnailUrl: MENU_IMAGE_URL,
              sourceUrl: REPO_LINK,
              mediaType: 1
            }
          }
        }, { quoted: message });

      } else {
        await reply(`❌ *Unable to fetch sports data*\n\n⚠️ The sports service may be temporarily unavailable.\n\n💡 Try again later.\n\n⚡ Powered by Tracle-Lite`);
      }

      // Send reaction
      await conn.sendMessage(from, {
        react: { text: "✅", key: message.key }
      }).catch(() => {});

    } catch (error) {
      console.error("❌ Sports Menu Error:", error.message);
      
      await reply(`❌ *Sports Menu Error*\n\n⚠️ ${error.message}\n\n💡 Try again later\n\n⚡ Powered by Tracle-Lite`);
      
      await conn.sendMessage(from, {
        react: { text: "❌", key: message.key }
      }).catch(() => {});
    }
  }
};
const axios = require("axios");

module.exports = {
  pattern: "logo",
  alias: ["logomaker", "textlogo", "logostyle"],
  desc: "Search and generate text logo styles",
  category: "tools",
  react: "🎨",
  filename: __filename,
  use: "<text>",

  execute: async (conn, message, m, { from, reply, args }) => {
    let searchText;
    try {
      searchText = args.join(" ");
      if (!searchText) {
        return reply(`🎨 *Logo Style Generator*

Search and generate text logo styles!

📝 *Usage:*
.logo Tracle
.logo Gaming
.logo Brenald

💡 *Examples:*
.logo TRACLE
.logo LITE
.logo BOT

🔍 Just type .logo followed by your text!`);
      }

      await reply(`🎨 *Searching logo styles for "${searchText}"...*\n⏳ Please wait...`);

      // Logo API - Page 1 only
      const apiUrl = `https://api.silvatech.co.ke/more/logo?text=${encodeURIComponent(searchText)}&page=1`;

      console.log(`📡 Calling Logo API: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      console.log(`📦 API Response status: ${response.status}`);
      console.log(`📦 Response data:`, JSON.stringify(response.data).substring(0, 200));

      // Check if we got results
      if (response.data && response.data.status === true) {
        const result = response.data.result;
        
        // Try to get styles from page1 or if result is directly an array
        let styles = [];
        
        if (result && result.page1 && Array.isArray(result.page1)) {
          styles = result.page1;
        } else if (result && Array.isArray(result)) {
          styles = result;
        } else if (result && result.data && Array.isArray(result.data)) {
          styles = result.data;
        } else if (Array.isArray(response.data.result)) {
          styles = response.data.result;
        }
        
        if (styles.length > 0) {
          let resultText = `🎨 *LOGO STYLES FOR "${searchText.toUpperCase()}"*\n\n`;
          resultText += `📊 *Found:* ${styles.length} styles\n`;
          resultText += `⚡ *Powered by:* Tracle-Lite\n\n`;
          resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

          // Show first 10 styles only to avoid message too long
          const displayStyles = styles.slice(0, 10);
          displayStyles.forEach((style, index) => {
            const title = style.title || style.name || `Style ${index + 1}`;
            const link = style.link || style.url || '#';
            resultText += `${index + 1}. ✨ *${title}*\n`;
            if (link !== '#') {
              resultText += `   🔗 ${link}\n`;
            }
            resultText += `\n`;
          });

          if (styles.length > 10) {
            resultText += `*+${styles.length - 10} more styles available*\n\n`;
          }

          resultText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          resultText += `💡 *How to use:*\n`;
          resultText += `1. Copy any link above\n`;
          resultText += `2. Open in your browser\n`;
          resultText += `3. Enter "${searchText}"\n`;
          resultText += `4. Generate and download your logo!\n\n`;
          resultText += `⚡ Powered by Tracle-Lite`;

          await reply(resultText);
          
          // Send a quick tip
          if (styles[0] && styles[0].link) {
            await reply(`🎨 *Quick Tip*\n\nTry this popular style:\n✨ ${styles[0].title}\n🔗 ${styles[0].link}\n\nVisit the link and enter "${searchText}" to create your logo!`);
          }

        } else {
          await reply(`❌ *No logo styles found for "${searchText}"*\n\n💡 Try:\n• Different text\n• Shorter text (2-10 characters)\n• .logo TRACLE\n• .logo LITE\n\n⚡ Powered by Tracle-Lite`);
        }

      } else {
        await reply(`❌ *No logo styles found!*\n\n📝 Text: ${searchText}\n\n💡 Try:\n• Different text\n• Shorter text\n• .logo TRACLE\n• .logo LITE\n\n⚡ Powered by Tracle-Lite`);
      }

      // Send reaction
      await conn.sendMessage(from, {
        react: { text: "✅", key: message.key }
      }).catch(() => {});

    } catch (error) {
      console.error("❌ Logo Search Error:", error.message);
      console.error("Full error:", error);
      
      let errorMsg = error.message;
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timeout. Please try again.';
      } else if (error.response?.status === 404) {
        errorMsg = 'Logo service temporarily unavailable.';
      } else if (error.response?.status === 429) {
        errorMsg = 'Too many requests. Please wait.';
      }
      
      const queryText = searchText || args.join(" ") || "unknown";
      
      await reply(`❌ *Logo Search Error*\n\n📝 Text: ${queryText}\n⚠️ ${errorMsg}\n\n💡 Try again later or use different text\n\n⚡ Powered by Tracle-Lite`);
      
      await conn.sendMessage(from, {
        react: { text: "❌", key: message.key }
      }).catch(() => {});
    }
  }
};
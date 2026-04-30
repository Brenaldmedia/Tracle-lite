const axios = require("axios");

module.exports = {
  pattern: "ai",
  alias: ["gpt", "chat", "ask", "openai"],
  desc: "Ask AI a question or chat with an intelligent assistant",
  react: "🤖",
  category: "ai",
  filename: __filename,

  execute: async (conn, mek, m, { from, args, q, reply }) => {
    try {
      const prompt = q || args.join(" ");
      if (!prompt)
        return await reply(
`💡 *AI Chatbot*

Ask me anything:

🧠 Example:
.ai who is Elon Musk
.ai write a short love poem
.ai generate an Instagram caption`
        );

      await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      await reply(`🤖 Thinking...\n\n💭 *${prompt}*`);

      let aiReply = null;
      
      // Try multiple APIs (fallback system)
      const apis = [
        // API 1: Silvatech Blackbox
        {
          url: `https://api.silvatech.co.ke/ai/blackbox?q=${encodeURIComponent(prompt)}`,
          extract: (data) => data.response || data.result || data.message || data.reply
        },
        // API 2: Alternative endpoint
        {
          url: `https://api.silvatech.co.ke/api/ai/chat?q=${encodeURIComponent(prompt)}`,
          extract: (data) => data.response || data.result || data.message || data.reply
        },
        // API 3: Another fallback
        {
          url: `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(prompt)}`,
          extract: (data) => data.answer || data.response || data.result || data.message
        }
      ];
      
      for (const api of apis) {
        try {
          console.log(`📡 Trying API: ${api.url}`);
          const res = await axios.get(api.url, { 
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'application/json'
            }
          });
          
          const data = res.data;
          const response = api.extract(data);
          
          if (response && response !== "null" && response !== "undefined" && response.length > 10) {
            aiReply = response;
            console.log(`✅ Got response from API: ${api.url.substring(0, 50)}...`);
            break;
          }
        } catch (err) {
          console.log(`❌ API failed: ${err.message}`);
          continue;
        }
      }
      
      // If no API worked, try a simple GET request to a free AI
      if (!aiReply) {
        try {
          const fallbackUrl = `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}`;
          const fallbackRes = await axios.get(fallbackUrl, { timeout: 10000 });
          if (fallbackRes.data && fallbackRes.data.response) {
            aiReply = fallbackRes.data.response;
          }
        } catch (err) {
          console.log(`❌ Fallback API failed: ${err.message}`);
        }
      }
      
      // Final fallback response
      if (!aiReply || aiReply === "null" || aiReply === "undefined") {
        aiReply = `🤖 *Response for:* "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"\n\n⚠️ I couldn't process your request right now. The AI service might be busy.\n\n💡 Try again in a few moments or rephrase your question.`;
      }
      
      // Send AI response
      await conn.sendMessage(from, { text: `🤖 *AI:*\n\n${aiReply}` }, { quoted: mek });
      console.log(`✅ AI Response sent for: ${prompt}`);

    } catch (error) {
      console.error("❌ AI Command Error:", error.message);
      await reply(`❌ *AI Error*\n\n${error.message}\n\nPlease try again later.`);
    }
  },
};
const axios = require("axios");

module.exports = {
  pattern: "chatgpt",
  alias: ["gpt", "ai", "ask", "openai", "blackbox"],
  desc: "Chat with AI",
  react: "🤖",
  category: "ai",
  filename: __filename,

  execute: async (conn, mek, m, { from, args, q, reply }) => {
    try {
      const prompt = q || args.join(" ");
      if (!prompt)
        return await reply(
`🤖 *ChatGPT - Silvatech Blackbox V4*

Advanced AI assistant at your service!

📝 *Examples:*
.chatgpt Who is Elon Musk?
.chatgpt Write a love poem
.chatgpt Explain quantum entanglement in simple terms
.chatgpt What is the meaning of life?

💡 Just type .chatgpt followed by your question!`
        );

      await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      await reply(`🤖 *ChatGPT is thinking...*\n\n💭 ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);

      // Using Silvatech Blackbox V4 API
      const apiUrl = `https://api.silvatech.co.ke/ai/blackboxv4?q=${encodeURIComponent(prompt)}`;

      console.log(`📡 Calling Silvatech Blackbox V4 API: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      console.log(`📦 API Response status: ${response.status}`);

      let aiReply = null;

      // Extract response from Silvatech Blackbox V4 API
      if (response.data) {
        if (response.data.response) {
          aiReply = response.data.response;
        } else if (response.data.result) {
          aiReply = response.data.result;
        } else if (response.data.message) {
          aiReply = response.data.message;
        } else if (response.data.reply) {
          aiReply = response.data.reply;
        } else if (response.data.answer) {
          aiReply = response.data.answer;
        } else if (typeof response.data === 'string') {
          aiReply = response.data;
        }
      }

      // If no response found, try to get from data.data
      if (!aiReply && response.data && response.data.data) {
        if (response.data.data.response) {
          aiReply = response.data.data.response;
        } else if (response.data.data.result) {
          aiReply = response.data.data.result;
        } else if (response.data.data.message) {
          aiReply = response.data.data.message;
        }
      }

      // Fallback response
      if (!aiReply || aiReply.length < 5) {
        aiReply = `🤔 *Chatgpt Response*\n\nI received your message but couldn't generate a proper response.\n\n📝 *Your question:* ${prompt}\n\n💡 Try asking in a different way or try again later.`;
      }

      // Send AI response
      await conn.sendMessage(from, { text: `🤖 *ChatGPT (Blackbox V4):*\n\n${aiReply}` }, { quoted: mek });
      console.log(`✅ ChatGPT response sent for: ${prompt.substring(0, 50)}`);

    } catch (error) {
      console.error("❌ ChatGPT Error:", error.message);

      let errorMsg = error.message;
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timeout. Please try again.';
      } else if (error.response?.status === 404) {
        errorMsg = 'API endpoint not found. Please try again later.';
      } else if (error.response?.status === 429) {
        errorMsg = 'Too many requests. Please wait a moment.';
      } else if (error.response?.status === 500) {
        errorMsg = 'Server error. Please try again.';
      }

      await reply(`❌ *ChatGPT Error*\n\n⚠️ ${errorMsg}\n\n💡 Try again in a few moments or rephrase your question.`);
      
      await conn.sendMessage(from, {
        react: { text: "❌", key: mek.key }
      }).catch(() => {});
    }
  },
};
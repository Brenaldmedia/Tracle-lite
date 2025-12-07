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

      // --- GiftedTech AI API ---
      const apiUrl = `https://api.giftedtech.co.ke/api/ai/openai?apikey=gifted&q=${encodeURIComponent(prompt)}`;

      const res = await axios.get(apiUrl, { timeout: 60000 });
      const data = res.data;

      // Extract AI response safely
      const aiReply =
        data?.result ||
        data?.response ||
        data?.answer ||
        data?.message ||
        "⚠️ I couldn’t get a response right now. Try again later.";

      // Send AI response
      await conn.sendMessage(from, { text: `🤖 *AI:*\n\n${aiReply}` }, { quoted: mek });

      console.log(`✅ AI Response sent for: ${prompt}`);
    } catch (error) {
      console.error("❌ AI Command Error:", error.message);

      if (error.code === "ECONNABORTED") {
        await reply("❌ Request timeout. Please try again.");
      } else if (error.response) {
        await reply("❌ API error. Please try again later.");
      } else {
        await reply("❌ Couldn’t connect to AI. Please try again.");
      }
    }
  },
};

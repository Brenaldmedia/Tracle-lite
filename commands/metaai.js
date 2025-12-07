// === metaai.js ===
const axios = require("axios");

module.exports = {
  pattern: "metaai",
  alias: ["meta", "facebookai", "letmegpt"],
  desc: "Ask Meta AI (LetMeGPT by GiftedTech 🌐)",
  category: "ai",
  react: "🌐",
  filename: __filename,
  use: ".metaai <question>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const query = args.join(" ").trim() || "Hello Meta AI!";

      if (!query) {
        return await reply(
          "❌ Please provide a question for Meta AI.\n\n💡 Example: `.metaai What is the weather today?`"
        );
      }

      console.log(`🌐 Meta AI Query: ${query}`);

      // === GiftedTech LetMeGPT API ===
      const apiUrl = `https://api.giftedtech.co.ke/api/ai/letmegpt?apikey=gifted&q=${encodeURIComponent(query)}`;

      console.log(`🔗 Using API: ${apiUrl}`);

      const { data } = await axios.get(apiUrl, {
        timeout: 60000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        },
      });

      console.log("📥 API Response:", JSON.stringify(data, null, 2));

      // === Parse AI Response ===
      let responseText =
        data?.result ||
        data?.response ||
        data?.answer ||
        data?.message ||
        data?.data ||
        (typeof data === "string" ? data : JSON.stringify(data));

      if (!responseText || !responseText.trim()) {
        return await reply("❌ Meta AI returned an empty response. Please try again.");
      }

      responseText = responseText.trim();

      // === Truncate if too long ===
      if (responseText.length > 4000) {
        responseText =
          responseText.substring(0, 4000) +
          "...\n\n💡 *Response truncated due to length limits.*";
      }

      // === Send AI Response ===
      await reply(`🌐 *AI says:*\n\n${responseText}`);

      console.log("✅ Meta AI response sent successfully.");
    } catch (error) {
      console.error("❌ [metaai.js] Error:", error.message);

      if (error.code === "ECONNABORTED") {
        await reply("⏰ Request timeout — Meta AI took too long to respond.");
      } else if (error.response) {
        await reply(`❌ API Error ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        await reply("🌐 Network error — could not reach the AI API.");
      } else {
        await reply("⚠️ Unexpected error contacting Meta AI. Please try again later.");
      }
    }
  },
};

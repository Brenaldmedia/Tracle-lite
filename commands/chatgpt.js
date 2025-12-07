const axios = require("axios");

// === PERSONAL INFO CONTEXT ===
const personalInfo = {
  name: "AI",
  partOf: "TRACLE - LITE WhatsApp Bot",
  creator: "Brenaldmedia",
  role: "Web Developer, Editor & Creator of Tracle Lite",
  description:
    "A creative full-stack developer, editor, and innovator who specializes in building modern tools, automation systems, and engaging content. As the creator of Tracle Lite, I blend coding, creativity, and problem-solving to build projects that help communities online.",
  repo: "https://github.com/Brenaldmedia/Tracle",
  purpose: "To provide smart AI chat replies directly inside WhatsApp.",
  links: {
    BOT_CHANNEL: "https://whatsapp.com/channel/0029VbBPPXV3WHTTNAWOGf0m",
    REPO_LINK: "https://github.com/Brenaldmedia/Tracle",
    YOUTUBE: "https://www.youtube.com/@BrenaldMedia",
    TIKTOK: "https://www.tiktok.com/@brenaldmedia?_",
    DISCORD: "https://discord.gg/f3RNWAh2",
    COMMUNITY: "https://chat.whatsapp.com/HyjSzOxCm8PEc3fEyvzL9S?mode=ems_copy_t",
  },
};

// === API HANDLER ===
async function askAI(prompt) {
  try {
    const apiUrl = `https://api.giftedtech.co.ke/api/ai/openai?apikey=gifted&q=${encodeURIComponent(prompt)}`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });

    let text =
      data?.result ||
      data?.response ||
      data?.answer ||
      data?.message ||
      data?.data ||
      data;

    if (typeof text !== "string") text = JSON.stringify(text);
    return text.trim();
  } catch (e) {
    console.error("[AI] API Error:", e.message);
    return "⚠️ The AI service is not responding right now. Please try again later.";
  }
}

// === COMMAND EXPORT ===
module.exports = {
  pattern: "chatgpt",
  alias: ["gpt", "ask", "ai"],
  desc: "Ask AI (powered by GiftedTech API)",
  category: "ai",
  react: "💬",
  filename: __filename,
  use: ".chatgpt <question>",

  execute: async (conn, mek, m, { from, args }) => {
    const query = args.join(" ").trim();
    if (!query)
      return conn.sendMessage(
        from,
        { text: "❎ Please provide a question.\n\nExample: `.chatgpt What is AI?`" },
        { quoted: mek }
      );

    await conn.sendMessage(from, { text: "🤖 Thinking..." }, { quoted: mek });

    const lowerQ = query.toLowerCase();
    const isAboutDev =
      lowerQ.includes("who made you") ||
      lowerQ.includes("creator") ||
      lowerQ.includes("developer") ||
      lowerQ.includes("who created you") ||
      lowerQ.includes("who built you") ||
      lowerQ.includes("who developed you") ||
      lowerQ.includes("made tracle") ||
      lowerQ.includes("who is brenald") ||
      lowerQ.includes("brenaldmedia") ||
      lowerQ.includes("who is your creator") ||
      lowerQ.includes("who is your developer") ||
      lowerQ.includes("who is your maker");

    let finalQuery = query;

    if (isAboutDev) {
      finalQuery = `
You are an AI integrated in TRACLE - LITE WhatsApp Bot.

About your creator and system:
- Creator: ${personalInfo.creator}
- Role: ${personalInfo.role}
- Description: ${personalInfo.description}
- Repository: ${personalInfo.repo}
- Purpose: ${personalInfo.purpose}

Links:
- WhatsApp Channel: ${personalInfo.links.BOT_CHANNEL}
- GitHub: ${personalInfo.links.REPO_LINK}
- YouTube: ${personalInfo.links.YOUTUBE}
- TikTok: ${personalInfo.links.TIKTOK}
- Discord: ${personalInfo.links.DISCORD}
- Community: ${personalInfo.links.COMMUNITY}

Now answer this question naturally: ${query}
`;
    }

    const response = await askAI(finalQuery);
    return await conn.sendMessage(
      from,
      { text: `💬 *AI says:*\n\n${response}` },
      { quoted: mek }
    );
  },
};

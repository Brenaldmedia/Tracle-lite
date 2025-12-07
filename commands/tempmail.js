// === tempmail.js ===
const axios = require("axios");

module.exports = {
  pattern: "tempmail",
  desc: "Generate a random temporary email address ✉️",
  category: "tools",
  react: "✉️",
  filename: __filename,
  use: ".tempmail",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      await reply("> ⏳ Generating temporary email...");

      const { data } = await axios.get("https://api.giftedtech.co.ke/api/tempmail/generate?apikey=gifted");

      if (!data || data.error || (!data.success && !data.result)) {
        console.error("[tempmail.js] invalid response", data);
        return reply("⚠️ Couldn’t generate temporary email.");
      }

      const result = data.result ?? data;
      const email = result.email || result.address || JSON.stringify(result);

      await reply(
        `✅ *Temporary email generated:*\n\`\`\`\n${email}\n\`\`\`\n\n` +
        `📥 To check inbox:\n.use *inboxx ${email}*\n\n` +
        `📬 To read a message:\n.use *tmails ${email} <messageid>*`
      );

    } catch (e) {
      console.error("[tempmail.js]", e);
      reply("⚠️ Error generating temporary email.");
    }
  },
};

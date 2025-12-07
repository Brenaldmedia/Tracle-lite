// === tmails.js ===
const axios = require("axios");

module.exports = {
  pattern: "tmails",
  desc: "Get a specific temp-mail message 📬",
  category: "tools",
  react: "📬",
  filename: __filename,
  use: ".tmails <email> <messageid>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const email = args[0];
      const messageId = args[1];

      if (!email || !messageId) {
        return reply("Usage: .tmails <email> <messageid>");
      }

      await reply(`> ⏳ Fetching message ${messageId} for ${email} ...`);

      const { data } = await axios.get(
        `https://api.giftedtech.co.ke/api/tempmail/message?apikey=gifted&email=${encodeURIComponent(email)}&messageid=${encodeURIComponent(messageId)}`
      );

      if (!data || data.error || (!data.success && !data.result)) {
        console.error("[tmails.js] invalid response", data);
        return reply("⚠️ Couldn’t fetch message.");
      }

      const result = data.result ?? data;

      let out = `📬 *Message Details:*\n\n`;
      if (result.subject) out += `*Subject:* ${result.subject}\n`;
      if (result.from) out += `*From:* ${result.from}\n`;
      if (result.date) out += `*Date:* ${result.date}\n\n`;
      if (result.body) out += `*Body:*\n${result.body}\n`;
      else out += "No body found.";

      await reply(out);

    } catch (e) {
      console.error("[tmails.js]", e);
      reply("⚠️ Error fetching message.");
    }
  },
};

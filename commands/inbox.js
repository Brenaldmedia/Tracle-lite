// === inboxx.js ===
const axios = require("axios");

module.exports = {
  pattern: "inboxx",
  desc: "Get inbox for a temporary email 📥",
  category: "tools",
  react: "📥",
  filename: __filename,
  use: ".inboxx <email>",

  execute: async (conn, mek, m, { from, reply, args }) => {
    try {
      const email = args[0] || (m.quoted && m.quoted.text);
      if (!email) return reply("Usage: .inboxx <email>\nOr reply to a message that contains the email.");

      await reply(`> ⏳ Fetching inbox for ${email} ...`);

      const { data } = await axios.get(`https://api.giftedtech.co.ke/api/tempmail/inbox?apikey=gifted&email=${encodeURIComponent(email)}`);

      if (!data || data.error || (!data.success && !data.result)) {
        console.error("[inboxx.js] invalid response", data);
        return reply("⚠️ Couldn’t fetch inbox.");
      }

      const inbox = data.result ?? data;
      if (!Array.isArray(inbox) || inbox.length === 0) {
        return reply(`📭 Inbox is empty for ${email}`);
      }

      let msgList = `📥 *Inbox for ${email}:*\n\n`;
      inbox.forEach((msg, i) => {
        msgList += `${i + 1}. *ID:* ${msg.id || msg.messageid}\n   *From:* ${msg.from || "Unknown"}\n   *Subject:* ${msg.subject || "No subject"}\n\n`;
      });

      msgList += `➡️ Use *.tmails ${email} <messageid>* to read a message.`;

      await reply(msgList);

    } catch (e) {
      console.error("[inboxx.js]", e);
      reply("⚠️ Error fetching inbox.");
    }
  },
};

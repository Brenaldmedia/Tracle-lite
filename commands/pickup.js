// === pickup.js ===
const axios = require("axios");

module.exports = {
  pattern: "pickupline",
  desc: "Get a pickup line 😉",
  category: "fun",
  react: "😉",
  filename: __filename,
  use: ".pickup",

  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const url = "https://api.giftedtech.co.ke/api/fun/pickupline?apikey=gifted";
      const { data } = await axios.get(url);

      if (!data.success || !data.result) {
        return reply("⚠️ Failed to fetch a pickup line. Try again later.");
      }

      const pickup = `😉 *Pickup Line:* \n\n${data.result}`;
      await conn.sendMessage(from, { text: pickup }, { quoted: mek });

    } catch (e) {
      console.error("[pickup.js]", e.message);
      reply("⚠️ Error fetching pickup line.");
    }
  },
};

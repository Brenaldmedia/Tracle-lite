// === bible.js ===
const fetch = require('node-fetch');

module.exports = {
  pattern: "bible",
  desc: "Get Bible verse by book, chapter, and verse (e.g., .bible John 3:16).",
  category: "faith", 
  filename: __filename,
  use: ".bible John 3:16",

  execute: async (conn, mek, m, { from, reply, q }) => {
    try {
      if (!q) {
        return reply("Please input a reference, e.g. `.bible John 3:16`");
      }

      const encoded = encodeURIComponent(q);
      const url = `https://bible-api.com/${encoded}`;
      const res = await fetch(url);

      if (!res.ok) {
        return reply(`Error fetching verse: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        return reply(`Bible API error: ${data.error}`);
      }

      // Format verse(s)
      const verses = Array.isArray(data.verses) ? data.verses : [data];
      const content = verses.map(v =>
        `${v.book_name} ${v.chapter}:${v.verse} — ${v.text.trim()}`
      ).join('\n\n');

      const caption = `✝️ *Bible (${data.translation_name || 'WEB'})*\n\n${content}\n\n> *© Powered By TRACLE-LITE*`;

      // Send reaction
      await conn.sendMessage(from, {
        react: {
          text: "✝️",
          key: mek.key
        }
      });

      await conn.sendMessage(from, { text: caption }, { quoted: mek });

    } catch (e) {
      console.error("Bible Error:", e);
      reply(`Error: ${e.message}`);
    }
  }
};
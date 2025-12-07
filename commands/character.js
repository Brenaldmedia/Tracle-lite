// commands/character.js
module.exports = {
  pattern: "character",
  desc: "Describe a user's character with funny/quirky traits",
  react: "🧠",
  category: "fun",
  filename: __filename,

  execute: async (conn, mek, m, { from, isGroup, reply }) => {
    try {
      if (!isGroup) {
        return reply("❌ This command can only be used in groups.");
      }

      // React with 🧠
      if (module.exports.react) {
        await conn.sendMessage(from, {
          react: { text: module.exports.react, key: mek.key }
        });
      }

      // Ensure the user tagged someone
      const target = m.mentionedJid?.[0] || mek.message?.extendedTextMessage?.contextInfo?.participant;
      if (!target) {
        return reply("❌ Please mention a user.\nUsage: `.character @user`");
      }

      // List of character traits (funny, bad, quirky mix)
      const traits = [
        "a patient person, but secretly very stubborn 😏",
        "lazy and forgetful, yet thinks they’re a genius 🧠",
        "overthinks everything and panics over nothing 😵",
        "loves drama and chaos, unavoidable in any group 🎭",
        "a complainer who still never changes 🤷‍♂️",
        "always late but expects everyone else to wait ⏰",
        "secretly very nosy and curious 👀",
        "tries to be cool, ends up awkward 😎",
        "always hungry but never shares food 🍔",
        "a perfectionist that never finishes anything ✅❌",
        "talks a lot but rarely listens 🗣️",
        "gets angry over tiny things but forgives quickly 🔥",
        "a procrastinator who works best at the last minute ⏳"
      ];

      const randomTrait = traits[Math.floor(Math.random() * traits.length)];

      // Build message
      const message = `🧠 @${target.split("@")[0]}'s character is: ${randomTrait}`;

      // Send with mentions
      await conn.sendMessage(from, {
        text: message,
        mentions: [target],
      }, { quoted: mek });

    } catch (error) {
      console.error("❌ Error in character command:", error);
      reply("⚠️ An error occurred while processing the command. Please try again.");
    }
  }
};

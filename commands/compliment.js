// === compliment.js ===
module.exports = {
  pattern: "compliment",
  desc: "Give a nice compliment to someone",
  category: "fun",
  filename: __filename,
  use: ".compliment @user",

  execute: async (conn, mek, m, { from, isGroup, reply }) => {
    try {
      if (!isGroup) {
        return reply("❌ This command can only be used in groups.");
      }

      const rawTarget =
        m.mentionedJid?.[0] ||
        mek.message?.extendedTextMessage?.contextInfo?.participant ||
        mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

      if (!rawTarget) {
        return reply(`Please mention or reply to a user.\nUsage: *${process.env.PREFIX || "."}compliment @user*`);
      }

      // Validate if target is in the group
      const groupMetadata = await conn.groupMetadata(from);
      const participants = groupMetadata.participants.map(p => p.id);

      if (!participants.includes(rawTarget)) {
        return reply("❌ The mentioned user is not in this group.");
      }

      // Prevent self-complimenting
      if (rawTarget === mek.participant || rawTarget === conn.user.id.split(':')[0] + '@s.whatsapp.net') {
        return reply("❌ You can't compliment yourself! Try complimenting someone else.");
      }

      const compliments = [
        "you're amazing just the way you are! 💖",
        "your smile is contagious! 😊",
        "you're a genius in your own way! 🧠",
        "you bring happiness to everyone around you! 🥰",
        "you're like human sunshine! ☀️",
        "your kindness makes the world a better place! ❤️",
        "you're unique and irreplaceable! ✨",
        "you're stronger than you think! 💪",
        "your creativity is beyond amazing! 🎨",
        "you make life more fun and interesting! 🎉",
        "you light up every room you walk into! 🌟",
        "the world is better because you're in it 🌍💖",
        "you have a heart of pure gold 🏅💛",
        "you inspire everyone around you ✨🙌",
        "your laugh could fix the worst of days 😂💞",
        "you're proof that good people still exist 🌹",
        "being friends with you is like winning the lottery 🎰💎",
        "you're not just special, you're unforgettable 💫",
        "you make people feel at home, even in chaos 🏡❤️",
        "you're the kind of person everyone deserves in their life 💕",
      ];

      const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];
      const targetUsername = rawTarget.split("@")[0];
      const message = `😊 @${targetUsername}, ${randomCompliment}\n\n> *© Powered By TRACLE-LITE*`;

      // Pick random emoji for reaction
      const emojis = ["😍", "😉", "😘", "😏", "❤️", "💖", "🔥", "✨", "🥰", "😊", "🌟", "💫"];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

      // ✅ Ensure reaction is attached to the command message
      await conn.sendMessage(from, {
        react: {
          text: randomEmoji,
          key: mek.key || m.key || mek.message?.key // fallback
        }
      });

      // Send compliment
      await conn.sendMessage(
        from,
        {
          text: message,
          mentions: [rawTarget],
        },
        { quoted: mek }
      );

    } catch (e) {
      console.error("Error in compliment.js:", e);
      reply("⚠️ Failed to send compliment. Please try again.");
    }
  },
};

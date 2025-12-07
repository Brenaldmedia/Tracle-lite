// === roast.js ===
module.exports = {
  pattern: "roast",
  desc: "Roast a mentioned or replied user (fun)",
  category: "fun",
  react: "🔥",
  filename: __filename,
  use: ".roast @user / reply",

  execute: async (conn, message, m, { from, isGroup, reply, sender }) => {
    try {
      if (!isGroup) return reply("❌ This command can only be used in groups.");

      // If user mentioned someone
      let mentioned = m.mentionedJid ? m.mentionedJid[0] : null;

      // If user replied to someone
      if (!mentioned && m.quoted) {
        mentioned = m.quoted.sender;
      }

      if (!mentioned) {
        return reply("❌ Mention or reply to someone to roast.");
      }

      // === All roasts 💀 ===
      const roasts = [
        "you're like a broken pencil — pointless. ",
        "you're like WiFi with one bar — barely working. ",
        "you're like a YouTube ad — nobody wants you, but we can’t skip you. ⏭",
        "you're like expired milk — no one wants you, but you keep showing up. ",
        "you're the human version of a typo. ⌨",
        "brains aren’t everything. In your case, they’re nothing ",
        "you must have been born on a highway, because that’s where most accidents happen ",
        "you're like a cloud — when you disappear, it’s a beautiful day ",
        "if laziness was a sport, you’d have a gold medal ",
        "your secrets are safe with me — I never even listen when you tell me them ",
        "you bring everyone together… in disappointment ",
        "you're like software updates — nobody wants you, but we’re forced to deal with you 💻",
        "your face makes onions cry ",
        "the last time you had a bright idea, Edison was still alive ",
        "you're proof that even evolution takes breaks ",
        "your personality is like a dial-up connection — outdated and annoying ",
        "you’re living proof that even mistakes can make it this far ",
        "your brain has more buffering than free WiFi in a mall ",
        "you remind me of a cloud storage trial — useless after 30 days ",
        "you're like math homework — nobody wants to do you and we all get headaches from trying 📚🤕",
      ];

      const roast = roasts[Math.floor(Math.random() * roasts.length)];

      // React 🔥
      await conn.sendMessage(from, {
        react: { text: "🔥", key: message.key }
      });

      // Send roast
      await conn.sendMessage(from, {
        text: `@${mentioned.split("@")[0]}, ${roast}`,
        mentions: [mentioned],
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200
          }
        }
      }, { quoted: message });

    } catch (e) {
      console.error("Roast error:", e);

      // React ❌
      await conn.sendMessage(from, {
        react: { text: "❌", key: message.key }
      });

      await conn.sendMessage(from, {
        text: "⚠️ Failed to roast user.",
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: 200
          }
        }
      }, { quoted: message });
    }
  }
};

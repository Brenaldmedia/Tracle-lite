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

      let mentioned = m.mentionedJid ? m.mentionedJid[0] : null;

      if (!mentioned && m.quoted) {
        mentioned = m.quoted.sender;
      }

      if (!mentioned) {
        return reply("❌ Mention or reply to someone to roast.");
      }

     const currentYear = new Date().getFullYear();

const roasts = [
  // Existing + upgraded brutal ones
  "you’re not useless… you could at least be used as a warning sign.",
  "your brain has more loading time than a 2005 browser.",
  "you have the confidence of WiFi with no internet.",
  "you don’t think outside the box… you forgot the box exists.",
  "you’re not a problem… you’re a full system failure.",
  "you’re like a broken link—nothing useful happens when people click on you.",
  "you’re not even background noise… you’re an error sound.",
  "you don’t bring vibes… you bring system lag.",
  "you’re like a demo version—limited and nobody upgrading.",
  "you’re the human version of ‘retry later’.",
  "you don’t miss opportunities… you actively avoid them.",
  "you’re not confusing… you’re just consistently wrong.",
  "you’re like a cracked screen—hard to look at and barely functional.",
  "you don’t need a glow up… you need a full rewrite.",
  "you’re like a silent notification—there but completely ignored.",
  "you’re not slow… you’re just committed to low performance.",
  "you’re the reason ‘try again’ buttons exist.",
  "you don’t fail fast… you fail repeatedly.",
  "you’re like bad code—works nowhere and breaks everything.",
  "you’re not even mid… you’re below average on your best day.",

  // 😈 extra brutal but still clean
  "you’re the human version of buffering at 1%.",
  "you bring less value than an empty commit.",
  "you’re like a password hint that makes things worse.",
  "you don’t lack potential… you just never use it.",
  "you’re like a notification with no message—pointless.",
  "you’re not rare… just rarely useful.",
  "you’re like a beta test nobody signed up for.",
  "you don’t stand out… you glitch out.",
  "you’re like a shortcut that leads nowhere.",
  "you’re not a vibe… you’re a warning.",
  "you’re like unused code—taking space for no reason.",
  "you’re not a main character… you’re a skipped cutscene.",
  "you’re like 404—personality not found.",
  "you don’t improve… you reload the same problems.",
  "you’re like a weak password—easy to break, hard to respect.",
  "you’re not late… you’re just never on time in life.",
  "you’re like lag in a game—nobody wants you but you keep showing up.",
  "you’re not different… just differently disappointing.",
  "you’re like a test nobody studied for—guaranteed failure.",
  "you’re not confusing… people just stopped trying to understand you.",

  // 🔥 dynamic year roast
  `it’s ${currentYear} and you’re still running on outdated behavior like nothing updated.`,
];

      await conn.sendMessage(from, {
        react: { text: "🔥", key: message.key }
      });

      await conn.sendMessage(from, {
        text: `@${mentioned.split("@")[0]}, ${roast}`,
        mentions: [mentioned],
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363401559573199@newsletter",
            newsletterName: "BrenaldMedia",
            serverMessageId: -1
          }
        }
      }, { quoted: message });

    } catch (e) {
      console.error("Roast error:", e);

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
            serverMessageId: -1
          }
        }
      }, { quoted: message });
    }
  }
};
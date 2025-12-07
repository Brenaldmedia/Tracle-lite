// === flux2.js ===
const fetch = require("node-fetch");

module.exports = {
  pattern: "flux2",
  desc: "Generate AI image (Flux 2)",
  category: "ai",
  async execute(msg, args) {
    if (!args.length) return msg.reply("Please provide a prompt.");
    const query = args.join(" ");
    const url = `https://apis-keith.vercel.app/ai/flux?q=${encodeURIComponent(query)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      await msg.reply(data.result || "Could not generate image.");
    } catch {
      await msg.reply("Could not fetch AI image.");
    }
  },
};

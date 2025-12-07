const axios = require("axios");

module.exports = {
  pattern: "play",
  alias: ["song", "music", "ytmp3"],
  desc: "Download songs from YouTube or Spotify as audio",
  react: "🎶",
  category: "music",
  filename: __filename,

  execute: async (conn, mek, m, { from, args, q, reply }) => {
    try {
      const query = q || args.join(" ");
      if (!query) {
        return await reply(
`🎵 *GiftedTech Audio Downloader*

📌 *Usage:*
.play <song name or link>

💡 *Examples:*
• .play rush
• .play calm down
• .play https://open.spotify.com/track/...
• .play https://youtu.be/...

✨ Works with Spotify & YouTube!`
        );
      }

      await conn.sendMessage(from, { react: { text: "🎶", key: mek.key } });
      await reply(`🔍 Searching and processing: *${query}*...`);

      let downloadUrl = "";
      let title = "";
      let thumb = "";
      let audioUrl = "";

      // === Case 1: Spotify link ===
      if (query.includes("spotify.com/track")) {
        const apiUrl = `https://api.giftedtech.co.ke/api/download/spotifydl?apikey=gifted&url=${encodeURIComponent(query)}`;
        console.log(`🎧 Spotify API: ${apiUrl}`);

        const res = await axios.get(apiUrl, { timeout: 60000 });
        const data = res.data;

        if (!data || !data.data || !data.data.download) {
          return await reply("❌ Failed to fetch Spotify audio. Try another song.");
        }

        title = data.data.title || "Spotify Track";
        thumb = data.data.cover || "";
        audioUrl = data.data.download;

      // === Case 2: YouTube link ===
      } else if (query.includes("youtu.be") || query.includes("youtube.com")) {
        const apiUrl = `https://api.giftedtech.co.ke/api/download/dlmp4?apikey=gifted&url=${encodeURIComponent(query)}`;
        console.log(`🎥 YouTube API: ${apiUrl}`);

        const res = await axios.get(apiUrl, { timeout: 60000 });
        const data = res.data;

        if (!data || !data.result || !data.result.url) {
          return await reply("❌ Failed to fetch YouTube audio. Try another video.");
        }

        title = data.result.title || "YouTube Audio";
        thumb = data.result.thumbnail || "";
        audioUrl = data.result.url;

      // === Case 3: Song name (search & download) ===
      } else {
        // Step 1: search YouTube for song title
        const searchApi = `https://api.giftedtech.co.ke/api/search/ytsearch?apikey=gifted&query=${encodeURIComponent(query)}`;
        console.log(`🔎 Searching YouTube: ${searchApi}`);

        const searchRes = await axios.get(searchApi, { timeout: 30000 });
        const first = searchRes.data?.result?.[0] || searchRes.data?.data?.[0];
        if (!first) return await reply("❌ No song found. Try another name.");

        const videoUrl = `https://youtu.be/${first.videoId}`;
        title = first.title || "Unknown Song";
        thumb = first.thumbnail || "";

        // Step 2: download using GiftedTech YouTube API
        const dlApi = `https://api.giftedtech.co.ke/api/download/dlmp4?apikey=gifted&url=${encodeURIComponent(videoUrl)}`;
        console.log(`⬇️ Downloading: ${dlApi}`);

        const dlRes = await axios.get(dlApi, { timeout: 60000 });
        const dlData = dlRes.data;
        if (!dlData || !dlData.result || !dlData.result.url)
          return await reply("❌ Could not download audio. Try again.");

        audioUrl = dlData.result.url;
      }

      // === Download thumbnail (optional) ===
      let thumbBuffer = null;
      if (thumb) {
        try {
          const thumbRes = await axios.get(thumb, { responseType: "arraybuffer", timeout: 10000 });
          thumbBuffer = Buffer.from(thumbRes.data);
        } catch (e) {
          console.log("⚠️ Thumbnail download failed");
        }
      }

      // === Download audio ===
      const audioRes = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 120000 });
      const audioBuffer = Buffer.from(audioRes.data);
      if (!audioBuffer || audioBuffer.length === 0) {
        return await reply("❌ Audio download failed. Please try again.");
      }

      const caption = `🎵 *${title}*\n\n💡 Powered by GiftedTech API`;

      await conn.sendMessage(
        from,
        {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          fileName: `${title.substring(0, 50)}.mp3`.replace(/[^\w\s\-]/gi, ""),
          caption: caption,
          ptt: false,
          jpegThumbnail: thumbBuffer,
        },
        { quoted: mek }
      );

      console.log(`✅ Sent audio: ${title}`);

    } catch (error) {
      console.error("❌ Play command error:", error.message);
      if (error.code === "ECONNABORTED") {
        await reply("❌ Request timeout. Please try again.");
      } else {
        await reply("❌ API error. Please try another song or check your link.");
      }
    }
  },
};

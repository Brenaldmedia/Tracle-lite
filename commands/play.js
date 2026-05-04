const axios = require("axios");

module.exports = {
    pattern: "play",
    alias: ["music", "song", "audio"],
    category: "downloader",
    description: "Search and download music",

    execute: async (conn, mek, m, { from, q, reply }) => {
        try {
            if (!q) {
                return reply(`🎵 *Music Player*\n\nUsage: .play [song name]\nExample: .play Burna Boy Last Last\n\n> Powered by Tracle-Lite`);
            }

            // React loading
            await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

            // Call the working API with longer timeout
            const response = await axios.get(`https://apis.davidcyril.name.ng/play?query=${encodeURIComponent(q)}`, {
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;

            if (!data.status || !data.result) {
                await reply(`❌ Couldn't find "${q}".\nTry a different search term.\n> Powered by Tracle-Lite`);
                await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                return;
            }

            const { title, thumbnail, duration, views, download_url } = data.result;

            // Download the audio with longer timeout
            let audioBuffer = null;

            try {
                const audioResponse = await axios({
                    method: 'get',
                    url: download_url,
                    responseType: 'arraybuffer',
                    timeout: 120000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                        'Connection': 'keep-alive'
                    }
                });
                audioBuffer = audioResponse.data;
                console.log(`✅ Downloaded: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);
            } catch (err) {
                console.log(`Download failed: ${err.message}`);
            }

            if (!audioBuffer) {
                await reply(`⚠️ Could not download audio.\n\n📎 *Direct Download Link:*\n${download_url}\n\n> Powered by Tracle-Lite`);
                await conn.sendMessage(from, { react: { text: "⚠️", key: mek.key } });
                return;
            }

            const fileSizeMB = audioBuffer.length / (1024 * 1024);

            if (fileSizeMB > 16) {
                await reply(`⚠️ Audio too large (${fileSizeMB.toFixed(2)} MB).\nWhatsApp limit is 16MB.\n\n📎 *Direct Link:* ${download_url}\n> Powered by Tracle-Lite`);
                await conn.sendMessage(from, { react: { text: "⚠️", key: mek.key } });
                return;
            }

            // Create context info with song details
            const contextInfo = {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363401559573199@newsletter",
                    newsletterName: "TRACLE-LITE",
                    serverMessageId: -1,
                },
                externalAdReply: {
                    title: `🎵 ${title.substring(0, 50)}`,
                    body: `⏱️ ${duration} | 👁️ ${Number(views).toLocaleString()} views`,
                    thumbnailUrl: thumbnail || "https://files.catbox.moe/zlu6dx.jpg",
                    sourceUrl: "https://github.com/Brenaldmedia/Tracle",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            };

            // Send the audio with context info
            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${title.replace(/[^\w\s]/gi, '').substring(0, 50)}.mp3`,
                contextInfo: contextInfo
            }, { quoted: mek });

            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        } catch (error) {
            console.error("Play command error:", error.message);
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                await reply(`⏰ *Timeout Error*\n\nThe server is taking too long to respond.\n\nTry:\n• Using a different song\n• Trying again in a few seconds\n• Using a more specific song name\n\n> Powered by Tracle-Lite`);
            } else if (error.message === 'fetch failed') {
                await reply(`❌ Network error. The download server might be slow.\n\nTry again later.\n> Powered by Tracle-Lite`);
            } else {
                await reply(`❌ Failed: ${error.message.substring(0, 100)}\n\nTry again later.\n> Powered by Tracle-Lite`);
            }
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        }
    }
};
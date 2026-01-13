const axios = require("axios");

module.exports = {
    pattern: "pinterest",
    desc: "Download media from Pinterest",
    react: "📌",
    category: "download",
    filename: __filename,

    execute: async (conn, mek, m, { from, args, q, reply }) => {
        // Helper function to send messages with contextInfo
        const sendMessageWithContext = async (text, quoted = mek) => {
            return await conn.sendMessage(from, {
                text: text,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363401559573199@newsletter",
                        newsletterName: "BrenaldMedia",
                        serverMessageId: -1
                    }
                }
            }, { quoted: quoted });
        };

        try {
            const query = q || args.join(" ");
            if (!query) {
                return await sendMessageWithContext(
                    '❎ Please provide the Pinterest URL to download from.\n\nExample: .pinterest https://pin.it/1cR6JJNpv'
                );
            }

            // Validate Pinterest URL
            if (!query.includes('pinterest.com') && !query.includes('pin.it')) {
                return await sendMessageWithContext('❎ Please provide a valid Pinterest URL (pinterest.com or pin.it)');
            }

            // React with pin emoji
            if (module.exports.react) {
                await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
            }

            await sendMessageWithContext("📌 Downloading from Pinterest... Please wait.");

            let response;
            let apiUsed = "GiftedTech";

            // Try GiftedTech API first
            try {
                const api = `https://api.giftedtech.web.id/api/download/pinterestdl?apikey=gifted&url=${encodeURIComponent(query)}`;
                response = await axios.get(api, { timeout: 30000 });
                
                if (!response.data.success) {
                    throw new Error('GiftedTech API failed');
                }
            } catch (error) {
                // Fallback to PrinceTech API
                try {
                    apiUsed = "PrinceTech";
                    const api = `https://api.princetechn.com/api/download/pinterestdl?apikey=prince&url=${encodeURIComponent(query)}`;
                    response = await axios.get(api, { timeout: 30000 });
                    
                    if (!response.data || !response.data.result) {
                        throw new Error('PrinceTech API failed');
                    }
                } catch (fallbackError) {
                    return await sendMessageWithContext('❎ Failed to fetch data from both Pinterest APIs. Please try again later.');
                }
            }

            let media, title, description;

            // Handle different API response structures
            if (apiUsed === "GiftedTech") {
                media = response.data.result.media;
                title = response.data.result.title || 'No title available';
                description = response.data.result.description || 'No description available';
            } else {
                // PrinceTech API structure
                media = response.data.result;
                title = response.data.result?.title || 'No title available';
                description = response.data.result?.description || 'No description available';
            }

            // Get the best quality media
            let mediaUrl;
            if (Array.isArray(media)) {
                // GiftedTech structure - array of media objects
                mediaUrl = media.find(item => item.type && item.type.includes('720p'))?.download_url || 
                          media.find(item => item.type && item.type.includes('video'))?.download_url || 
                          media[0]?.download_url;
            } else if (media?.download_url) {
                // PrinceTech structure - single media object
                mediaUrl = media.download_url;
            }

            if (!mediaUrl) {
                return await sendMessageWithContext('❎ No downloadable media found in the response.');
            }

            const caption = `╭━━━〔 *PINTEREST DOWNLOAD* 〕━━━┈⊷
┃▸╭───────────
┃▸┃๏ *PINS DOWNLOADER*
┃▸└───────────···๏
╰────────────────┈⊷
╭━━❐━⪼
┇๏ *Title* - ${title}
┇๏ *Source* - ${apiUsed}
┇๏ *Description* - ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}
╰━━❑━⪼
> *© Powered By BrenaldMedia ♡*`;

            // Determine if it's video or image and send accordingly
            const isVideo = mediaUrl.includes('.mp4') || 
                           mediaUrl.includes('video') ||
                           (Array.isArray(media) && media.some(item => item.type && item.type.includes('video'))) ||
                           (media?.type && media.type.includes('video'));

            if (isVideo) {
                await conn.sendMessage(from, {
                    video: { url: mediaUrl },
                    caption: caption,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363401559573199@newsletter",
                            newsletterName: "BrenaldMedia",
                            serverMessageId: -1
                        }
                    }
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    image: { url: mediaUrl },
                    caption: caption,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363401559573199@newsletter",
                            newsletterName: "BrenaldMedia",
                            serverMessageId: -1
                        }
                    }
                }, { quoted: mek });
            }

        } catch (e) {
            console.error("❌ Pinterest Download Error:", e.message);
            await sendMessageWithContext(`⚠️ Error: ${e.message}`);
        }
    }
};
const axios = require("axios")
const crypto = require("crypto")
const yts = require("yt-search")
const fs = require("fs")
const path = require("path")
const { exec } = require("child_process")
const util = require("util")
const execPromise = util.promisify(exec)

const savetube = {
  api: {
    base: "https://media.savetube.me/api",
    cdn: "/random-cdn",
    info: "/v2/info",
    download: "/download",
  },
  headers: {
    accept: "*/*",
    "content-type": "application/json",
    origin: "https://yt.savetube.me",
    referer: "https://yt.savetube.me/",
    "user-agent": "Postify/1.0.0",
  },
  formats: ["144", "240", "360", "480", "720", "1080", "mp3"],
  crypto: {
    hexToBuffer: (hexString) => {
      const matches = hexString.match(/.{1,2}/g)
      return Buffer.from(matches.join(""), "hex")
    },
    decrypt: async (enc) => {
      try {
        const secretKey = "C5D58EF67A7584E4A29F6C35BBC4EB12"
        const data = Buffer.from(enc, "base64")
        const iv = data.slice(0, 16)
        const content = data.slice(16)
        const key = savetube.crypto.hexToBuffer(secretKey)
        const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv)
        let decrypted = decipher.update(content)
        decrypted = Buffer.concat([decrypted, decipher.final()])
        return JSON.parse(decrypted.toString())
      } catch (error) {
        throw new Error(error)
      }
    },
  },
  youtube: (url) => {
    if (!url) return null
    const a = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const b of a) {
      if (b.test(url)) return url.match(b)[1]
    }
    return null
  },
  request: async (endpoint, data = {}, method = "post") => {
    try {
      const { data: response } = await axios({
        method,
        url: `${endpoint.startsWith("http") ? "" : savetube.api.base}${endpoint}`,
        data: method === "post" ? data : undefined,
        params: method === "get" ? data : undefined,
        headers: savetube.headers,
      })
      return {
        status: true,
        code: 200,
        data: response,
      }
    } catch (error) {
      throw new Error(error)
    }
  },
  getCDN: async () => {
    const response = await savetube.request(savetube.api.cdn, {}, "get")
    if (!response.status) throw new Error(response)
    return {
      status: true,
      code: 200,
      data: response.data.cdn,
    }
  },
  download: async (link, format) => {
    if (!link) {
      return {
        status: false,
        code: 400,
        error: "No link provided. Please provide a valid YouTube link.",
      }
    }
    if (!format || !savetube.formats.includes(format)) {
      return {
        status: false,
        code: 400,
        error: "Invalid format. Please choose one of the available formats: 144, 240, 360, 480, 720, 1080, mp3.",
        available_fmt: savetube.formats,
      }
    }
    const id = savetube.youtube(link)
    if (!id) throw new Error("Invalid YouTube link.")
    try {
      const cdnx = await savetube.getCDN()
      if (!cdnx.status) return cdnx
      const cdn = cdnx.data
      const result = await savetube.request(`https://${cdn}${savetube.api.info}`, {
        url: `https://www.youtube.com/watch?v=${id}`,
      })
      if (!result.status) return result
      const decrypted = await savetube.crypto.decrypt(result.data.data)
      var dl
      try {
        dl = await savetube.request(`https://${cdn}${savetube.api.download}`, {
          id: id,
          downloadType: format === "mp3" ? "audio" : "video",
          quality: format === "mp3" ? "128" : format,
          key: decrypted.key,
        })
      } catch (error) {
        throw new Error("Failed to get download link. Please try again later.")
      }
      return {
        status: true,
        code: 200,
        result: {
          title: decrypted.title || "Unknown Title",
          type: format === "mp3" ? "audio" : "video",
          format: format,
          thumbnail: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/0.jpg`,
          download: dl.data.data.downloadUrl,
          id: id,
          key: decrypted.key,
          duration: decrypted.duration,
          quality: format === "mp3" ? "128" : format,
          downloaded: dl.data.data.downloaded,
        },
      }
    } catch (error) {
      throw new Error("An error occurred while processing your request. Please try again later.")
    }
  },
}

module.exports = {
    pattern: "song",
    desc: "Download music from YouTube",
    category: "download",
    react: "🎵",
    filename: __filename,
    use: ".song [song_name or youtube_url]",

    execute: async (conn, message, m, { from, q, args }) => {
        try {
            const searchQuery = q || args.join(' ') || '';
            
            if (!searchQuery) {
                return await conn.sendMessage(from, { 
                    text: "❌ What song do you want to download?\n\nExample: .song asake\nExample: .song https://youtube.com/watch?v=xxx"
                });
            }

            // Determine if input is a YouTube link or search query
            let videoUrl = ""
            if (searchQuery.startsWith("http://") || searchQuery.startsWith("https://")) {
                videoUrl = searchQuery
            } else {
                // Search YouTube for the video
                const { videos } = await yts(searchQuery)
                if (!videos || videos.length === 0) {
                    return await conn.sendMessage(from, { 
                        text: "❌ No songs found for: " + searchQuery 
                    });
                }
                videoUrl = videos[0].url
            }

            let result
            const apiMethods = [
                async () => await savetube.download(videoUrl, "mp3"),
                async () => {
                    const response = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${videoUrl}`, {
                        timeout: 15000,
                    })
                    if (response.data && response.data.status && response.data.download) {
                        return {
                            status: true,
                            result: {
                                title: response.data.title || "Unknown Title",
                                download: response.data.download,
                                thumbnail: response.data.thumbnail || `https://i.ytimg.com/vi/${videoUrl.split("v=")[1]}/0.jpg`,
                            },
                        }
                    }
                    throw new Error("API response invalid")
                },
                async () => {
                    const response = await axios.get(`https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${videoUrl}`, { timeout: 15000 })
                    if (response.data && response.data.result && response.data.result.url) {
                        return {
                            status: true,
                            result: {
                                title: response.data.result.title || "Unknown Title",
                                download: response.data.result.url,
                                thumbnail: response.data.result.thumbnail || `https://i.ytimg.com/vi/${videoUrl.split("v=")[1]}/0.jpg`,
                            },
                        }
                    }
                    throw new Error("API response invalid")
                },
            ]

            let apiWorked = false
            for (const method of apiMethods) {
                try {
                    result = await method()
                    if (result && result.status && result.result && result.result.download) {
                        apiWorked = true
                        break
                    }
                } catch (err) {
                    console.log("API method failed, trying next...")
                    continue
                }
            }

            if (!apiWorked || !result || !result.status || !result.result || !result.result.download) {
                return await conn.sendMessage(from, {
                    text: "❌ Failed to get a valid download link from all APIs. Please try again later.",
                });
            }

            // Send thumbnail and title first
            let sentMsg
            try {
                sentMsg = await conn.sendMessage(
                    from,
                    {
                        image: { url: result.result.thumbnail },
                        caption: `🎵 *${result.result.title}*\n\n🔍 _Downloading song..._\n\n> © TRACLE - LITE 💜`,
                    },
                    { quoted: message },
                )
            } catch (e) {
                // If thumbnail fails, fallback to just sending the audio
                sentMsg = message
            }

            // Download the MP3 file
            const tempDir = path.join(__dirname, "../../temp")
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
            const tempFile = path.join(tempDir, `${Date.now()}.mp3`)
            const response = await axios({ url: result.result.download, method: "GET", responseType: "stream" })
            if (response.status !== 200) {
                return await conn.sendMessage(from, { 
                    text: "❌ Failed to download the song file from the server." 
                });
            }
            const writer = fs.createWriteStream(tempFile)
            response.data.pipe(writer)
            await new Promise((resolve, reject) => {
                writer.on("finish", resolve)
                writer.on("error", reject)
            })

            // Send the MP3 file
            await conn.sendMessage(
                from,
                {
                    audio: fs.readFileSync(tempFile),
                    mimetype: "audio/mpeg",
                    fileName: `${result.result.title.replace(/[^\w\s]/g, '')}.mp3`,
                    ptt: false,
                },
                { quoted: message },
            )

            // Clean up temp file
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
                } catch {}
            }, 5000)
        } catch (error) {
            console.error('Song download error:', error);
            await conn.sendMessage(from, { 
                text: "❌ Download failed. Please try again later." 
            });
        }
    }
};
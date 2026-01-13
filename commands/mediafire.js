// === mediafire.js ===
const axios = require("axios");

function getFilenameFromDisposition(header) {
  if (!header) return null;
  // filename*=UTF-8''name or filename="name"
  const m1 = header.match(/filename\*=UTF-8''([^;]*)/i);
  if (m1) return decodeURIComponent(m1[1]);
  const m2 = header.match(/filename="?([^";]+)"?/i);
  if (m2) return m2[1];
  return null;
}

function extToMime(name) {
  if (!name) return "application/octet-stream";
  const ext = name.split(".").pop().toLowerCase();
  const map = {
    pdf: "application/pdf",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
  };
  return map[ext] || "application/octet-stream";
}

module.exports = {
  pattern: "mediafire",
  desc: "Download a MediaFire file (tries API then page scrape)",
  category: "tools",
  react: "📁",
  filename: __filename,
  use: ".mediafire <mediafire-url>",

  execute: async (conn, mek, m, { from, args, reply }) => {
    if (!args || !args[0]) {
      return reply("❌ Usage: .mediafire <mediafire-share-url>\nExample: .mediafire https://www.mediafire.com/file/xxx/filename/file");
    }

    const shareUrl = args[0].trim();
    try {
      // react to user's message
      try {
        await conn.sendMessage(from, { react: { text: module.exports.react, key: mek.key } });
      } catch (e) {
        console.warn("[mediafire] Reaction failed (ignored):", e.message);
      }

      // Tell user only minimal info
      await reply("📥 Downloading file... please wait.");

      const apisToTry = [
        // primary the giftedtech api you used
        `https://api.giftedtech.co.ke/api/download/mediafire?apikey=gifted&url=${encodeURIComponent(shareUrl)}`,
        // fallback: an example endpoint if you have another provider (uncomment/change if you have)
        // `https://api.princetechn.com/api/download/mediafire?apikey=prince&url=${encodeURIComponent(shareUrl)}`
      ];

      let fileBuffer = null;
      let fileName = null;
      let mimeType = null;

      // Helper to attempt API (returns true on success)
      async function tryApi(apiUrl) {
        console.log(`[mediafire] trying api: ${apiUrl}`);
        try {
          const res = await axios.get(apiUrl, {
            responseType: "arraybuffer",
            timeout: 45000,
            maxContentLength: Infinity,
            validateStatus: status => status < 500, // accept 2xx/3xx/4xx, handle errors
          });

          const ct = (res.headers["content-type"] || "").toLowerCase();
          // If JSON returned, parse and inspect
          if (ct.includes("application/json") || ct.includes("text/json") || ct.includes("application/problem+json")) {
            const text = Buffer.from(res.data).toString("utf8");
            let json;
            try {
              json = JSON.parse(text);
            } catch (e) {
              throw new Error("API returned malformed JSON");
            }
            console.log("[mediafire] API JSON response:", json);
            // Common patterns: { status:false, error:... } or { url: "...", base64: "..."}
            if (json.status === false && json.error) {
              throw new Error(`API error: ${json.error}`);
            }
            if (json.base64) {
              fileBuffer = Buffer.from(json.base64, "base64");
              fileName = json.filename || "file.bin";
              mimeType = json.mimetype || extToMime(fileName);
              return true;
            }
            if (json.url) {
              // If API provided a direct file URL, fetch it
              console.log("[mediafire] API provided redirect url, fetching:", json.url);
              const dl = await axios.get(json.url, { responseType: "arraybuffer", timeout: 60000, maxContentLength: Infinity });
              fileBuffer = Buffer.from(dl.data);
              fileName = getFilenameFromDisposition(dl.headers["content-disposition"]) || (json.filename || "file.bin");
              mimeType = dl.headers["content-type"] ? dl.headers["content-type"].split(";")[0] : extToMime(fileName);
              return true;
            }
            // else no usable data
            throw new Error("API returned JSON but no usable file or url");
          }

          // If API returned binary directly
          if (res.data && res.data.byteLength > 0) {
            fileBuffer = Buffer.from(res.data);
            fileName = getFilenameFromDisposition(res.headers["content-disposition"]) || (new URL(shareUrl).pathname.split("/").slice(-2, -1)[0]) || "file";
            mimeType = res.headers["content-type"] ? res.headers["content-type"].split(";")[0] : extToMime(fileName);
            console.log("[mediafire] API returned binary. filename:", fileName, "mimetype:", mimeType);
            return true;
          }

          return false;
        } catch (err) {
          console.warn("[mediafire] tryApi failed:", err.message);
          return false;
        }
      }

      // Try APIs sequentially (console logs only)
      for (const api of apisToTry) {
        try {
          const ok = await tryApi(api);
          if (ok) break;
        } catch (e) {
          console.warn("[mediafire] api attempt threw:", e.message);
        }
      }

      // If APIs didn't produce file, try scraping MediaFire share page
      if (!fileBuffer) {
        console.log("[mediafire] APIs failed or unreachable, trying direct page scrape for:", shareUrl);
        try {
          const page = await axios.get(shareUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            timeout: 20000,
          });
          const html = page.data;

          // try multiple regex patterns to find direct download link
          const patterns = [
            /href="(https?:\/\/download[^"]+)"/i,
            /"downloadUrl":"(https?:\\\/\\\/[^"]+)"/i,
            /"filelink":"(https?:\\\/\\\/[^"]+)"/i,
            /id="downloadButton"[^>]*href="([^"]+)"/i,
            /window\.open\("([^"]+download[^"]+)"\)/i
          ];

          let direct = null;
          for (const p of patterns) {
            const m = html.match(p);
            if (m && m[1]) {
              direct = m[1].replace(/\\\//g, "/");
              break;
            }
          }

          if (!direct) {
            // sometimes the site uses //download... form
            const m2 = html.match(/(\/\/download[^"']+)/i);
            if (m2) direct = "https:" + m2[1];
          }

          if (!direct) {
            console.warn("[mediafire] failed to extract direct download link from HTML");
            throw new Error("Could not find direct download link on MediaFire page (page structure changed?)");
          }

          console.log("[mediafire] extracted direct link:", direct);

          const dl = await axios.get(direct, {
            responseType: "arraybuffer",
            timeout: 60000,
            maxContentLength: Infinity,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
          });

          if (!dl || !dl.data) throw new Error("Failed to download file from direct URL");

          fileBuffer = Buffer.from(dl.data);
          fileName = getFilenameFromDisposition(dl.headers["content-disposition"]) || (new URL(shareUrl).pathname.split("/").slice(-2, -1)[0]) || "file";
          mimeType = dl.headers["content-type"] ? dl.headers["content-type"].split(";")[0] : extToMime(fileName);
          console.log("[mediafire] scrape download success:", fileName, mimeType);
        } catch (scrapeErr) {
          console.error("[mediafire] scrape attempt failed:", scrapeErr.message);
        }
      }

      // If still no fileBuffer, fail
      if (!fileBuffer) {
        console.error("[mediafire] all methods failed. Informing user.");
        return reply("⚠️ Could not download the file. The API host might be down (ENOTFOUND) or MediaFire blocked the request. Try again later or try a different link.");
      }

      // Send the document (WhatsApp)
      const finalName = fileName || "file.bin";
      const finalMime = mimeType || extToMime(finalName);
      console.log(`[mediafire] sending file -> ${finalName} (${finalMime}) size=${fileBuffer.length} bytes`);

      await conn.sendMessage(from, {
        document: fileBuffer,
        fileName: finalName,
        mimetype: finalMime,
        fileLength: fileBuffer.length,
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

      // success
      console.log("[mediafire] file sent successfully.");
    } catch (err) {
      console.error("[mediafire] error:", err);
      return reply(`❌ Error: ${err.message || "Failed to download/send file"}`);
    }
  }
};

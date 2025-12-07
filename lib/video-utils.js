// lib/video-utils.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Convert video to webp
async function videoToWebp(videoBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const tempInput = path.join(__dirname, `../temp/${Date.now()}.mp4`);
            const tempOutput = path.join(__dirname, `../temp/${Date.now()}.webp`);
            
            // Ensure temp directory exists
            if (!fs.existsSync(path.dirname(tempInput))) {
                fs.mkdirSync(path.dirname(tempInput), { recursive: true });
            }
            
            fs.writeFileSync(tempInput, videoBuffer);
            
            const args = [
                '-i', tempInput,
                '-vcodec', 'libwebp',
                '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1',
                '-loop', '0',
                '-preset', 'default',
                '-an',
                '-vsync', '0',
                '-s', '512:512',
                '-f', 'webp',
                '-y', tempOutput
            ];
            
            const ffmpeg = spawn('ffmpeg', args);
            
            ffmpeg.on('error', (error) => {
                cleanup();
                reject(error);
            });
            
            ffmpeg.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempOutput)) {
                    const webpBuffer = fs.readFileSync(tempOutput);
                    cleanup();
                    resolve(webpBuffer);
                } else {
                    cleanup();
                    reject(new Error(`FFmpeg failed with code ${code}`));
                }
            });
            
            function cleanup() {
                try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch {}
                try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch {}
            }
            
        } catch (error) {
            reject(error);
        }
    });
}

// Convert image to webp
async function imageToWebp(imageBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const sharp = require('sharp');
            const webpBuffer = await sharp(imageBuffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp({ quality: 80 })
                .toBuffer();
            resolve(webpBuffer);
        } catch (error) {
            reject(error);
        }
    });
}

// Convert webp to image
async function webpToImage(webpBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const sharp = require('sharp');
            const imageBuffer = await sharp(webpBuffer)
                .png({ quality: 90 })
                .toBuffer();
            resolve(imageBuffer);
        } catch (error) {
            reject(error);
        }
    });
}

// Convert webp to video (for animated stickers)
async function webpToVideo(webpBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const tempInput = path.join(__dirname, `../temp/${Date.now()}.webp`);
            const tempOutput = path.join(__dirname, `../temp/${Date.now()}.mp4`);
            
            // Ensure temp directory exists
            if (!fs.existsSync(path.dirname(tempInput))) {
                fs.mkdirSync(path.dirname(tempInput), { recursive: true });
            }
            
            fs.writeFileSync(tempInput, webpBuffer);
            
            const args = [
                '-i', tempInput,
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                '-y', tempOutput
            ];
            
            const ffmpeg = spawn('ffmpeg', args);
            
            ffmpeg.on('error', (error) => {
                cleanup();
                reject(error);
            });
            
            ffmpeg.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempOutput)) {
                    const videoBuffer = fs.readFileSync(tempOutput);
                    cleanup();
                    resolve(videoBuffer);
                } else {
                    cleanup();
                    reject(new Error(`FFmpeg failed with code ${code}`));
                }
            });
            
            function cleanup() {
                try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch {}
                try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch {}
            }
            
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    videoToWebp,
    imageToWebp,
    webpToImage,
    webpToVideo
};
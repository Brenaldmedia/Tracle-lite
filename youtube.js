const yts = require('youtube-yts');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const axios = require('axios');

// We'll use external APIs to avoid 403 errors
class YouTubeDownloader {
    constructor() {
        this.tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync(this.tmpDir, { recursive: true });
        }
    }

    /**
     * Check if URL is YouTube
     */
    isYouTubeUrl(url) {
        const patterns = [
            /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
        ];
        return patterns.some(pattern => pattern.test(url));
    }

    /**
     * Extract video ID
     */
    getVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    /**
     * Search YouTube videos
     */
    async searchVideos(query) {
        try {
            const searchResults = await yts.search({ query, hl: 'en', gl: 'US' });
            return searchResults.videos.map(video => ({
                id: video.videoId,
                title: video.title,
                thumbnail: video.thumbnail,
                duration: video.duration.timestamp || video.duration,
                views: video.views,
                author: video.author.name,
                url: `https://youtu.be/${video.videoId}`
            }));
        } catch (error) {
            console.error('YouTube search error:', error);
            throw error;
        }
    }

    /**
     * Get video info using external API
     */
    async getVideoInfo(url) {
        try {
            const videoId = this.getVideoId(url) || url;
            
            // Try multiple APIs
            const apis = [
                `https://noembed.com/embed?url=https://youtube.com/watch?v=${videoId}`,
                `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`,
                `https://api.rival.rocks/youtube/info?video_id=${videoId}`
            ];

            let info = null;
            for (const api of apis) {
                try {
                    const response = await axios.get(api, { timeout: 10000 });
                    if (response.data) {
                        info = response.data;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!info) {
                throw new Error('Could not fetch video info');
            }

            return {
                id: videoId,
                title: info.title || 'Unknown Title',
                thumbnail: info.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                channel: {
                    name: info.author_name || 'Unknown Channel',
                    url: info.author_url || `https://youtube.com/channel/${videoId}`
                },
                duration: this.formatDurationFromSeconds(info.duration_seconds || 0)
            };
        } catch (error) {
            console.error('Video info error:', error);
            throw error;
        }
    }

    /**
     * Format duration
     */
    formatDurationFromSeconds(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Download video using external APIs (no intermediate messages)
     */
    async downloadVideo(url, quality = '360') {
        try {
            const videoId = this.getVideoId(url) || url;
            
            // Use external download APIs
            const downloadAPIs = [
                // YTMP3 API
                `https://ytmp3.is/api/ajaxSearch?q=${encodeURIComponent(`https://youtube.com/watch?v=${videoId}`)}`,
                // YT1s API
                `https://yt1s.com/api/ajaxSearch/index`,
                // Y2mate API (via proxy)
                `https://cobalt-api.tukul.tech/api/json?url=https://youtube.com/watch?v=${videoId}`
            ];

            let downloadUrl = null;
            let title = 'YouTube Video';
            let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

            // Try to get video info first
            try {
                const info = await this.getVideoInfo(url);
                title = info.title;
                thumbnail = info.thumbnail;
            } catch (e) {
                console.log('Could not get detailed info:', e.message);
            }

            // Try each API
            for (const api of downloadAPIs) {
                try {
                    if (api.includes('yt1s.com')) {
                        // YT1s requires POST
                        const response = await axios.post(api, 
                            `q=https://youtube.com/watch?v=${videoId}&vt=home`,
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                                },
                                timeout: 15000
                            }
                        );
                        
                        if (response.data && response.data.vid && response.data.title) {
                            title = response.data.title;
                            const convertUrl = `https://yt1s.com/api/ajaxConvert/convert`;
                            const convertResponse = await axios.post(convertUrl,
                                `vid=${response.data.vid}&k=${response.data.links.mp3['18'].k}`,
                                {
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                                    }
                                }
                            );
                            
                            if (convertResponse.data && convertResponse.data.dlink) {
                                downloadUrl = convertResponse.data.dlink;
                                break;
                            }
                        }
                    } else if (api.includes('cobalt-api')) {
                        // Cobalt API
                        const response = await axios.get(api, { timeout: 15000 });
                        if (response.data && response.data.url) {
                            downloadUrl = response.data.url;
                            break;
                        }
                    }
                } catch (apiError) {
                    console.log(`API ${api} failed:`, apiError.message);
                    continue;
                }
            }

            if (!downloadUrl) {
                // Fallback to direct download with user-agent
                downloadUrl = `https://youtube.com/watch?v=${videoId}`;
            }

            // Download the file
            const fileName = `${Date.now()}_${randomBytes(4).toString('hex')}.mp4`;
            const filePath = path.join(this.tmpDir, fileName);

            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 60000
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    resolve({
                        path: filePath,
                        meta: {
                            title: title,
                            thumbnail: thumbnail,
                            quality: quality + 'p',
                            size: fs.statSync(filePath).size
                        }
                    });
                });
                writer.on('error', reject);
            });
        } catch (error) {
            console.error('Video download error:', error);
            throw error;
        }
    }

    /**
     * Download audio using external APIs
     */
    async downloadAudio(url) {
        try {
            const videoId = this.getVideoId(url) || url;
            
            // Use YTMP3 API
            const apiUrl = `https://ytmp3.is/api/ajaxSearch`;
            
            const response = await axios.post(apiUrl,
                `q=${encodeURIComponent(`https://youtube.com/watch?v=${videoId}`)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 15000
                }
            );

            if (!response.data || !response.data.vid) {
                throw new Error('Failed to get audio download link');
            }

            // Get the actual download link
            const convertUrl = `https://ytmp3.is/api/ajaxConvert`;
            const convertResponse = await axios.post(convertUrl,
                `vid=${response.data.vid}&k=${response.data.links.mp3['128'].k}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }
            );

            if (!convertResponse.data || !convertResponse.data.dlink) {
                throw new Error('Failed to convert audio');
            }

            const fileName = `${Date.now()}_${randomBytes(4).toString('hex')}.mp3`;
            const filePath = path.join(this.tmpDir, fileName);

            // Download the audio file
            const audioResponse = await axios({
                method: 'GET',
                url: convertResponse.data.dlink,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 60000
            });

            const writer = fs.createWriteStream(filePath);
            audioResponse.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    resolve({
                        path: filePath,
                        meta: {
                            title: response.data.title || 'YouTube Audio',
                            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                            size: fs.statSync(filePath).size
                        }
                    });
                });
                writer.on('error', reject);
            });
        } catch (error) {
            console.error('Audio download error:', error);
            throw error;
        }
    }

    /**
     * Cleanup temporary files
     */
    cleanup(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                setTimeout(() => {
                    fs.unlinkSync(filePath);
                }, 30000); // Delete after 30 seconds
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

module.exports = new YouTubeDownloader();
// --- SERVER.JS - NO PACKAGES REQUIRED ---
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const CONFIG = {
    port: process.env.PORT || 3000,
    maxRequests: 10000, // 10,000 requests per minute
    windowMs: 60000, // 1 minute
    proxyList: [
        'https://cors-anywhere.herokuapp.com/',
        'https://api.allorigins.win/raw?url=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://cors-proxy.htmldriven.com/?url=',
        'https://jsonp.afeld.me/?url='
    ],
    apis: {
        cobalt: 'https://api.cobalt.tools/api/json',
        cobaltBackup: 'https://cobalt-api.onrender.com/api/json',
        y2mate: 'https://www.y2mate.com/mates/en/681/analyze',
        y2mateBackup: 'https://yt1s.com/api/ajax/search',
        savefrom: 'https://sfrom.net/api/convert',
        ninebuddy: 'https://9xbuddy.org/api/json',
        odysee: 'https://odysee.com/api/v1/proxy',
        invidious: 'https://vid.puffyan.us/api/v1',
        invidiousBackup: 'https://yewtu.be/api/v1',
        youtubeBackup: 'https://yt.lemnoslife.com/videos?part=snippet&id=',
        nuxt: 'https://nuxt.djs.workers.dev/api',
        co: 'https://co.wuk.sh/api/json',
        snaptik: 'https://snaptik.app/abc?url=',
        snaptikBackup: 'https://tikmate.online/download?url=',
        tikmate: 'https://tikmate.online/download?url=',
        instagram: 'https://ddinstagram.com/',
        facebook: 'https://mbasic.facebook.com/',
        twitter: 'https://tweethunt.com/api/v1/tw-dl',
        reddit: 'https://v.redd.it/',
        soundcloud: 'https://soundcloudmp3.org/',
        dailymotion: 'https://www.dailymotion.com/player/metadata/video/'
    }
};

// --- RATE LIMITING WITH MULTIPLE WINDOWS ---
class AdvancedRateLimiter {
    constructor() {
        this.windows = [];
        this.currentWindow = 0;
        this.windowSize = 10; // 10 windows of 6 seconds each = 60 seconds
        this.requestsPerWindow = CONFIG.maxRequests / this.windowSize;
    }

    isAllowed(ip) {
        const now = Date.now();
        const windowIndex = Math.floor(now / 6000) % this.windowSize;
        
        if (!this.windows[windowIndex]) {
            this.windows[windowIndex] = new Map();
        }
        
        const window = this.windows[windowIndex];
        const count = window.get(ip) || 0;
        
        if (count >= this.requestsPerWindow) {
            return false;
        }
        
        window.set(ip, count + 1);
        
        // Clean old windows
        setTimeout(() => {
            this.windows[windowIndex] = undefined;
        }, 6000);
        
        return true;
    }
}

const rateLimiter = new AdvancedRateLimiter();

// --- CACHE SYSTEM ---
class Cache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 10000;
    }

    get(key) {
        const item = this.cache.get(key);
        if (item && Date.now() - item.timestamp < 300000) { // 5 minutes
            return item.data;
        }
        this.cache.delete(key);
        return null;
    }

    set(key, data) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}

const cache = new Cache();

// --- IP ROTATION SYSTEM ---
class ProxyRotator {
    constructor() {
        this.currentIndex = 0;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
            'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0'
        ];
    }

    getProxy() {
        const proxy = CONFIG.proxyList[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % CONFIG.proxyList.length;
        return proxy;
    }

    getUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }
}

const proxyRotator = new ProxyRotator();

// --- ADVANCED API HANDLER ---
class APIHandler {
    static async makeRequest(url, options = {}) {
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        let lastError;
        
        // Try with different proxies
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const proxyUrl = proxyRotator.getProxy();
                const finalUrl = url.startsWith('http') ? url : proxyUrl + encodeURIComponent(url);
                
                const response = await this.fetchWithTimeout(finalUrl, {
                    ...options,
                    headers: {
                        'User-Agent': proxyRotator.getUserAgent(),
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        ...options.headers
                    }
                });

                const data = await response.json();
                cache.set(cacheKey, data);
                return data;
            } catch (error) {
                lastError = error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }

        throw lastError;
    }

    static async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}

// --- VIDEO DOWNLOADER CLASS ---
class VideoDownloader {
    static async downloadVideo(videoUrl, options = {}) {
        const platform = this.detectPlatform(videoUrl);
        
        switch (platform) {
            case 'youtube':
                return this.downloadYouTube(videoUrl, options);
            case 'instagram':
                return this.downloadInstagram(videoUrl, options);
            case 'tiktok':
                return this.downloadTikTok(videoUrl, options);
            case 'facebook':
                return this.downloadFacebook(videoUrl, options);
            case 'twitter':
                return this.downloadTwitter(videoUrl, options);
            case 'reddit':
                return this.downloadReddit(videoUrl, options);
            case 'soundcloud':
                return this.downloadSoundCloud(videoUrl, options);
            case 'dailymotion':
                return this.downloadDailymotion(videoUrl, options);
            default:
                return this.downloadGeneric(videoUrl, options);
        }
    }

    static detectPlatform(url) {
        const patterns = {
            youtube: /youtube\.com|youtu\.be/,
            instagram: /instagram\.com/,
            tiktok: /tiktok\.com/,
            facebook: /facebook\.com|fb\.watch/,
            twitter: /twitter\.com|x\.com/,
            reddit: /reddit\.com/,
            soundcloud: /soundcloud\.com/,
            dailymotion: /dailymotion\.com/
        };

        for (const [platform, pattern] of Object.entries(patterns)) {
            if (pattern.test(url)) {
                return platform;
            }
        }
        return 'generic';
    }

    static async downloadYouTube(videoUrl, options) {
        // Try multiple APIs for YouTube
        const apis = [
            () => this.downloadYouTubeCobalt(videoUrl, options),
            () => this.downloadYouTubeY2mate(videoUrl, options),
            () => this.downloadYouTubeInvidious(videoUrl, options),
            () => this.downloadYouTubeBackup(videoUrl, options)
        ];

        for (const api of apis) {
            try {
                const result = await api();
                if (result && result.url) {
                    return result;
                }
            } catch (error) {
                console.log('API failed, trying next...');
            }
        }

        throw new Error('All YouTube APIs failed');
    }

    static async downloadYouTubeCobalt(videoUrl, options) {
        const requestBody = {
            url: videoUrl,
            vCodec: options.vCodec || 'h264',
            vQuality: options.vQuality || '720',
            aFormat: options.aFormat || 'mp3',
            filenamePattern: 'pretty',
            isAudioOnly: options.isAudioOnly || false,
            isTTFullAudio: false,
            isAudioMuted: false,
            dubLang: false,
            disableMetadata: false
        };

        const response = await APIHandler.makeRequest(CONFIG.apis.cobalt, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (response.status === 'error') {
            throw new Error(response.text);
        }

        return {
            url: response.url,
            filename: response.filename,
            platform: 'youtube',
            quality: options.vQuality || '720p',
            format: options.isAudioOnly ? 'mp3' : 'mp4'
        };
    }

    static async downloadYouTubeY2mate(videoUrl, options) {
        const videoId = this.extractYouTubeId(videoUrl);
        const analyzeUrl = `${CONFIG.apis.y2mate}?url=${encodeURIComponent(videoUrl)}&q_auto=0`;
        
        const response = await APIHandler.makeRequest(analyzeUrl);
        
        if (response.links) {
            const quality = options.vQuality || '720p';
            const link = response.links.mp4?.[quality] || response.links.mp4?.['720p'] || response.links.mp4?.auto;
            
            if (link) {
                return {
                    url: link,
                    filename: response.title || 'video.mp4',
                    platform: 'youtube',
                    quality: quality,
                    format: 'mp4'
                };
            }
        }

        throw new Error('Y2Mate failed');
    }

    static async downloadYouTubeInvidious(videoUrl, options) {
        const videoId = this.extractYouTubeId(videoUrl);
        const apiUrl = `${CONFIG.apis.invidious}/videos/${videoId}?fields=formatStreams,title,description`;
        
        const response = await APIHandler.makeRequest(apiUrl);
        
        if (response.formatStreams) {
            const quality = options.vQuality || '720p';
            const videoStream = response.formatStreams.find(s => s.qualityLabel && s.qualityLabel.includes(quality));
            
            if (videoStream) {
                return {
                    url: videoStream.url,
                    filename: `${response.title}.mp4`,
                    platform: 'youtube',
                    quality: quality,
                    format: 'mp4'
                };
            }
        }

        throw new Error('Invidious failed');
    }

    static async downloadYouTubeBackup(videoUrl, options) {
        const videoId = this.extractYouTubeId(videoUrl);
        const apiUrl = `${CONFIG.apis.youtubeBackup}${videoId}`;
        
        const response = await APIHandler.makeRequest(apiUrl);
        
        if (response.items && response.items[0]) {
            return {
                url: `https://redirector.googlevideo.com/videoplayback?id=${videoId}`,
                filename: response.items[0].snippet?.title || 'video.mp4',
                platform: 'youtube',
                quality: options.vQuality || '720p',
                format: 'mp4'
            };
        }

        throw new Error('YouTube backup failed');
    }

    static async downloadInstagram(videoUrl, options) {
        const apis = [
            () => this.downloadInstagramDirect(videoUrl, options),
            () => this.downloadInstagramBackup(videoUrl, options)
        ];

        for (const api of apis) {
            try {
                const result = await api();
                if (result && result.url) {
                    return result;
                }
            } catch (error) {
                console.log('Instagram API failed, trying next...');
            }
        }

        throw new Error('All Instagram APIs failed');
    }

    static async downloadInstagramDirect(videoUrl, options) {
        const modifiedUrl = videoUrl.replace('instagram.com', 'ddinstagram.com');
        
        return {
            url: modifiedUrl,
            filename: 'instagram_video.mp4',
            platform: 'instagram',
            quality: options.vQuality || '720p',
            format: 'mp4'
        };
    }

    static async downloadTikTok(videoUrl, options) {
        const apis = [
            () => this.downloadTikTokSnaptik(videoUrl, options),
            () => this.downloadTikTokMate(videoUrl, options),
            () => this.downloadTikTokBackup(videoUrl, options)
        ];

        for (const api of apis) {
            try {
                const result = await api();
                if (result && result.url) {
                    return result;
                }
            } catch (error) {
                console.log('TikTok API failed, trying next...');
            }
        }

        throw new Error('All TikTok APIs failed');
    }

    static async downloadTikTokSnaptik(videoUrl, options) {
        const apiUrl = CONFIG.apis.snaptik + encodeURIComponent(videoUrl);
        const response = await APIHandler.makeRequest(apiUrl);
        
        if (response.url) {
            return {
                url: response.url,
                filename: 'tiktok_video.mp4',
                platform: 'tiktok',
                quality: options.vQuality || '720p',
                format: 'mp4'
            };
        }

        throw new Error('Snaptik failed');
    }

    static extractYouTubeId(url) {
        const patterns = [
            /youtube\.com\/watch\?v=([^&]+)/,
            /youtu\.be\/([^?]+)/,
            /youtube\.com\/embed\/([^?]+)/,
            /youtube\.com\/shorts\/([^?]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    // Add more platform methods as needed...
}

// --- HTTP SERVER ---
const server = http.createServer(async (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    '127.0.0.1';

    // Enable CORS for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    try {
        // Rate limiting check
        if (!rateLimiter.isAllowed(clientIP)) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Rate limit exceeded',
                message: 'Too many requests. Please try again later.',
                retryAfter: 60
            }));
            return;
        }

        // Static file serving
        if (pathname === '/' || pathname === '/index.html') {
            serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
        } else if (pathname === '/style.css') {
            serveFile(res, path.join(__dirname, 'style.css'), 'text/css');
        } else if (pathname === '/script.js') {
            serveFile(res, path.join(__dirname, 'script.js'), 'application/javascript');
        } else if (pathname === '/manifest.json') {
            serveFile(res, path.join(__dirname, 'manifest.json'), 'application/json');
        } else if (pathname === '/sw.js') {
            serveFile(res, path.join(__dirname, 'sw.js'), 'application/javascript');
        } 
        // API Routes
        else if (pathname.startsWith('/api/')) {
            await handleAPI(req, res, parsedUrl);
        }
        // Download route
        else if (pathname.startsWith('/download/')) {
            await handleDownload(req, res, parsedUrl);
        }
        // Fallback to index.html for SPA
        else {
            serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
        }
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }));
    }
});

// --- FILE SERVING FUNCTION ---
function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File not found' }));
            return;
        }

        res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600'
        });
        res.end(data);
    });
}

// --- API HANDLER ---
async function handleAPI(req, res, parsedUrl) {
    const pathname = parsedUrl.pathname;
    
    if (pathname === '/api/download' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const result = await VideoDownloader.downloadVideo(data.url, data.options || {});
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: result
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            }
        });
    } else if (pathname === '/api/search' && req.method === 'GET') {
        const query = parsedUrl.query.q;
        const platform = parsedUrl.query.platform || 'youtube';
        
        try {
            // Search implementation here
            const results = await searchVideos(query, platform);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: results
            }));
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    } else if (pathname === '/api/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            activeConnections: server.connections,
            cacheSize: cache.cache.size,
            uptime: process.uptime()
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
}

// --- SEARCH FUNCTION ---
async function searchVideos(query, platform) {
    // Implementation for video search
    return {
        results: [],
        total: 0,
        platform: platform
    };
}

// --- DOWNLOAD HANDLER ---
async function handleDownload(req, res, parsedUrl) {
    const downloadId = parsedUrl.pathname.split('/download/')[1];
    
    if (!downloadId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Download ID required' }));
        return;
    }

    // Get download info from cache or database
    const downloadInfo = cache.get(`download_${downloadId}`);
    
    if (!downloadInfo) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Download not found or expired' }));
        return;
    }

    // Redirect to actual download URL
    res.writeHead(302, { Location: downloadInfo.url });
    res.end();
}

// --- GRACEFUL SHUTDOWN ---
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// --- START SERVER ---
server.listen(CONFIG.port, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🚀 ALLIO PRO SERVER STARTED SUCCESSFULLY! 🚀               ║
║                                                              ║
║    📍 Server running on: http://localhost:${CONFIG.port}        ║
║    🔄 Rate Limit: ${CONFIG.maxRequests} requests/minute         ║
║    🌐 Multiple APIs & Proxies Active                         ║
║    💾 Cache Size: ${cache.maxSize} items                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
});

// Export for testing
module.exports = { server, CONFIG, VideoDownloader, rateLimiter, cache };
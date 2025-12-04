// --- SERVER.JS - UPDATED FOR 2025 DEPLOYMENT ---
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const CONFIG = {
    port: process.env.PORT || 3000,
    apis: {
        cobalt: 'https://api.cobalt.tools/api/json',
        cobaltBackup: 'https://co.wuk.sh/api/json',
        invidious: 'https://vid.puffyan.us/api/v1',
        invidiousBackup: 'https://yewtu.be/api/v1',
        youtubeOembed: 'https://www.youtube.com/oembed'
    }
};

// --- CACHE SYSTEM ---
class Cache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 100;
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

// --- API HANDLER ---
class APIHandler {
    static async makeRequest(url, options = {}) {
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await this.fetchWithTimeout(url, {
                ...options,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
            console.error('API request error:', error);
            throw error;
        }
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

    static async downloadYouTube(videoUrl, options = {}) {
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

        try {
            // Try primary API first
            let response = await APIHandler.makeRequest(CONFIG.apis.cobalt, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            // If primary fails, try backup
            if (!response || response.status === 'error') {
                response = await APIHandler.makeRequest(CONFIG.apis.cobaltBackup, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
            }
            
            if (response && response.status !== 'error' && response.url) {
                return {
                    url: response.url,
                    filename: response.filename || 'video.mp4',
                    platform: 'youtube',
                    quality: options.vQuality || '720p',
                    format: options.isAudioOnly ? 'mp3' : 'mp4'
                };
            }
            
            throw new Error('All YouTube APIs failed');
        } catch (error) {
            console.error('YouTube download error:', error);
            throw error;
        }
    }

    static async downloadVideo(videoUrl, options = {}) {
        const platform = this.detectPlatform(videoUrl);
        
        switch (platform) {
            case 'youtube':
                return this.downloadYouTube(videoUrl, options);
            case 'instagram':
                return this.downloadInstagram(videoUrl, options);
            case 'tiktok':
                return this.downloadTikTok(videoUrl, options);
            default:
                return this.downloadGeneric(videoUrl, options);
        }
    }

    static async downloadInstagram(videoUrl, options = {}) {
        const modifiedUrl = videoUrl.replace('instagram.com', 'ddinstagram.com');
        
        return {
            url: modifiedUrl,
            filename: 'instagram_video.mp4',
            platform: 'instagram',
            quality: options.vQuality || '720p',
            format: 'mp4'
        };
    }

    static async downloadTikTok(videoUrl, options = {}) {
        // For TikTok, we'll use a simple approach
        return {
            url: videoUrl,
            filename: 'tiktok_video.mp4',
            platform: 'tiktok',
            quality: options.vQuality || '720p',
            format: 'mp4'
        };
    }

    static async downloadGeneric(videoUrl, options = {}) {
        // For generic platforms, we'll return the URL as is
        return {
            url: videoUrl,
            filename: 'video.mp4',
            platform: 'generic',
            quality: options.vQuality || '720p',
            format: 'mp4'
        };
    }
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
            // Search implementation
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
    const cacheKey = `search_${platform}_${query}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    let results = [];
    
    if (platform === 'youtube') {
        try {
            const searchUrl = `${CONFIG.apis.invidious}/search?q=${encodeURIComponent(query)}&type=video`;
            const response = await APIHandler.makeRequest(searchUrl);
            results = response || [];
        } catch (error) {
            console.error('YouTube search failed:', error);
            // Try backup instance
            try {
                const backupUrl = `${CONFIG.apis.invidiousBackup}/search?q=${encodeURIComponent(query)}&type=video`;
                const response = await APIHandler.makeRequest(backupUrl);
                results = response || [];
            } catch (backupError) {
                console.error('Backup YouTube search failed:', backupError);
            }
        }
    }

    cache.set(cacheKey, results);
    return results;
}

// --- DOWNLOAD HANDLER ---
async function handleDownload(req, res, parsedUrl) {
    const downloadId = parsedUrl.pathname.split('/download/')[1];
    
    if (!downloadId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Download ID required' }));
        return;
    }

    // Get download info from cache
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

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                              ║
║    🚀 ALLIO PRO SERVER STARTED SUCCESSFULLY! 🚀               ║
║                                                              ║
║    📍 Server running on: http://localhost:${PORT}           ║
║    🌐 Multiple APIs Active                                 ║
║    💾 Cache Size: ${cache.maxSize} items                   ║
║    📅 Updated: December 2025                              ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝
    `);
});

// Export for Vercel
module.exports = (req, res) => {
    server.emit('request', req, res);
};
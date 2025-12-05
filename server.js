// --- SERVER.JS - UPDATED FOR VERCEL DEPLOYMENT ---
const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const cors = require('cors');

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

// --- CREATE EXPRESS APP ---
const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- API ROUTES ---
app.get('/api/stats', (req, res) => {
    res.json({
        activeConnections: app.connections || 0,
        cacheSize: cache.cache.size,
        uptime: process.uptime()
    });
});

app.post('/api/download', async (req, res) => {
    try {
        const { url, options = {} } = req.body;
        const result = await VideoDownloader.downloadVideo(url, options);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const platform = req.query.platform || 'youtube';
    
    try {
        // Search implementation
        const results = await searchVideos(query, platform);
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/download/:id', (req, res) => {
    const downloadId = req.params.id;
    
    if (!downloadId) {
        return res.status(400).json({ error: 'Download ID required' });
    }

    // Get download info from cache
    const downloadInfo = cache.get(`download_${downloadId}`);
    
    if (!downloadInfo) {
        return res.status(404).json({ error: 'Download not found or expired' });
    }

    // Redirect to actual download URL
    res.redirect(302, downloadInfo.url);
});

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

// --- SERVE HTML FOR ALL OTHER ROUTES ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- START SERVER ---
if (require.main === module) {
    app.listen(CONFIG.port, () => {
        console.log(`
    ╔════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║    🚀 ALLIO PRO SERVER STARTED SUCCESSFULLY! 🚀               ║
    ║                                                              ║
    ║    📍 Server running on: http://localhost:${CONFIG.port}           ║
    ║    🌐 Multiple APIs Active                                 ║
    ║    💾 Cache Size: ${cache.maxSize} items                   ║
    ║    📅 Updated: December 2025                              ║
    ║                                                              ║
    ╚════════════════════════════════════════════════════════════╝
        `);
    });
}

// Export for Vercel
module.exports = app;
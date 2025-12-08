// ===== ALLIO PRO SERVER - SIMPLIFIED FOR VERCEL =====

const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Simple cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper: Get from cache
function getCache(key) {
    const item = cache.get(key);
    if (item && Date.now() - item.time < CACHE_TTL) {
        return item.data;
    }
    cache.delete(key);
    return null;
}

// Helper: Set cache
function setCache(key, data) {
    if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    cache.set(key, { data, time: Date.now() });
}

// ===== API ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        cache_size: cache.size
    });
});

// Get video info (proxy to avoid CORS)
app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }
        
        // Check cache
        const cacheKey = `info_${url}`;
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // Fetch from Cobalt API
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ALLIO-PRO/1.0'
            },
            body: JSON.stringify({
                url: url,
                vCodec: 'h264',
                vQuality: '720',
                filenamePattern: 'basic'
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache result
        setCache(cacheKey, data);
        
        res.json(data);
        
    } catch (error) {
        console.error('Video info error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch video info',
            message: error.message 
        });
    }
});

// Download endpoint (proxy)
app.post('/api/download', async (req, res) => {
    try {
        const { url, quality = '720', isAudio = false } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }
        
        // Check cache
        const cacheKey = `dl_${url}_${quality}_${isAudio}`;
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // Fetch from Cobalt API
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ALLIO-PRO/1.0'
            },
            body: JSON.stringify({
                url: url,
                vCodec: 'h264',
                vQuality: quality,
                aFormat: 'mp3',
                isAudioOnly: isAudio,
                filenamePattern: 'pretty'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Download request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error' || data.status === 'rate-limit') {
            return res.status(400).json({ 
                error: data.text || 'Download failed' 
            });
        }
        
        // Cache result
        setCache(cacheKey, data);
        
        res.json(data);
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: 'Download failed',
            message: error.message 
        });
    }
});

// YouTube Search API
app.get('/api/youtube-search', async (req, res) => {
    try {
        const { q, maxResults = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }
        
        // Check cache
        const cacheKey = `search_${q}_${maxResults}`;
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // Use YouTube Data API v3
        const apiKey = process.env.YOUTUBE_API_KEY || 'AIzaSyC7u-2sK5O6iQj5B-0X6Y7Z8A9B0C1D2E3F';
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=${maxResults}&key=${apiKey}`
        );
        
        if (!response.ok) {
            throw new Error(`YouTube search failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform the response
        const results = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            platform: 'youtube'
        }));
        
        // Cache result
        setCache(cacheKey, { items: results });
        
        res.json({ items: results });
        
    } catch (error) {
        console.error('YouTube search error:', error);
        res.status(500).json({ 
            error: 'YouTube search failed',
            message: error.message 
        });
    }
});

// Get video metadata from YouTube
app.get('/api/youtube-metadata', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }
        
        // Check cache
        const cacheKey = `meta_${url}`;
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // Extract video ID
        const videoId = extractYouTubeId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }
        
        // Fetch from YouTube oEmbed
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        
        if (!response.ok) {
            throw new Error(`Metadata fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache result
        setCache(cacheKey, data);
        
        res.json(data);
        
    } catch (error) {
        console.error('Metadata error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch metadata',
            message: error.message 
        });
    }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    res.json({
        cache_size: cache.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Clear cache endpoint (admin only)
app.post('/api/clear-cache', (req, res) => {
    const { adminKey } = req.body;
    
    // Simple admin key check (in production, use proper authentication)
    if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    cache.clear();
    res.json({ message: 'Cache cleared successfully' });
});

// Proxy endpoint for external APIs (to avoid CORS)
app.post('/api/proxy', async (req, res) => {
    try {
        const { url, method = 'GET', headers = {}, body } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: body ? JSON.stringify(body) : undefined
        });
        
        const data = await response.json();
        
        res.json({
            status: response.status,
            data
        });
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            error: 'Proxy request failed',
            message: error.message 
        });
    }
});

// Platform detection endpoint
app.post('/api/detect-platform', (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }
        
        const platform = detectPlatform(url);
        
        res.json({
            platform,
            supported: platform !== 'unknown'
        });
        
    } catch (error) {
        console.error('Platform detection error:', error);
        res.status(500).json({ 
            error: 'Platform detection failed',
            message: error.message 
        });
    }
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Helper functions
function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function detectPlatform(url) {
    const patterns = {
        youtube: /youtube\.com|youtu\.be/i,
        instagram: /instagram\.com/i,
        tiktok: /tiktok\.com/i,
        facebook: /facebook\.com|fb\.watch/i,
        twitter: /twitter\.com|x\.com/i,
        vimeo: /vimeo\.com/i,
        dailymotion: /dailymotion\.com/i,
        soundcloud: /soundcloud\.com/i,
        twitch: /twitch\.tv/i,
        reddit: /reddit\.com/i,
        pinterest: /pinterest\.com/i
    };
    
    for (const [platform, pattern] of Object.entries(patterns)) {
        if (pattern.test(url)) return platform;
    }
    return 'unknown';
}

// Start server (only if not in Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════╗
║   ALLIO PRO SERVER RUNNING            ║
║   Port: ${PORT}                      ║
║   Environment: ${process.env.NODE_ENV || 'development'}     ║
║   Cache TTL: ${CACHE_TTL / 1000}s              ║
║   Rate Limit: 100 req/15min           ║
╚════════════════════════════════════════╝
        `);
    });
}

// Export for Vercel
module.exports = app;
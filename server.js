// ===== ALLIO PRO - BACKEND SERVER =====
// Handles API requests for searching YouTube and proxying download requests to Cobalt.

const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const ytsr = require('ytsr');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// CRITICAL: Serve static files from the root directory for a flat structure
app.use(express.static(__dirname));

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
        
        // Fetch from Cobalt API with more parameters to get file size info
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                // Spoof headers to look like a real browser
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                vCodec: 'h264',
                vQuality: '720' // Default quality for info
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract and add file size information
        if (data && data.url) {
            // Try to get file size from headers
            try {
                const headResponse = await fetch(data.url, { method: 'HEAD' });
                if (headResponse.ok) {
                    const contentLength = headResponse.headers.get('content-length');
                    if (contentLength) {
                        data.fileSize = parseInt(contentLength);
                    }
                }
            } catch (e) {
                console.warn('Could not fetch file size:', e);
            }
            
            // Create format options with estimated sizes
            data.formats = [
                { format: 'mp4', quality: '1080', fileSize: data.fileSize ? data.fileSize * 1.8 : null },
                { format: 'mp4', quality: '720', fileSize: data.fileSize || null },
                { format: 'mp4', quality: '480', fileSize: data.fileSize ? data.fileSize * 0.5 : null },
                { format: 'mp3', quality: '320', fileSize: data.fileSize ? data.fileSize * 0.2 : null }
            ];
        }
        
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

// FIXED: Download endpoint (proxy) with proper headers and JSON payload handling
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
        
        // FIXED: Added proper headers and JSON payload handling
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                // Spoof headers to look like a real browser
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
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
        
        // Try to get file size
        if (data && data.url) {
            try {
                const headResponse = await fetch(data.url, { method: 'HEAD' });
                if (headResponse.ok) {
                    const contentLength = headResponse.headers.get('content-length');
                    if (contentLength) {
                        data.fileSize = parseInt(contentLength);
                    }
                }
            } catch (e) {
                console.warn('Could not fetch file size:', e);
            }
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

// FIXED: YouTube Search API using ytsr
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
        
        // Use ytsr library to fetch search results
        const searchFilters = await ytsr.getFilters(q);
        const filter = searchFilters.get('Type').get('Video');
        const searchResults = await ytsr(filter.url, { limit: maxResults });
        
        // Map the results to the format expected by the frontend
        const results = searchResults.items.map(item => ({
            id: item.id,
            title: item.title,
            channel: item.author?.name || 'Unknown Channel',
            thumbnail: item.bestThumbnail?.url || 'https://via.placeholder.com/320x180',
            duration: item.duration || '',
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

// Get video metadata from YouTube (using oEmbed as a fallback)
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

// FIXED: Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
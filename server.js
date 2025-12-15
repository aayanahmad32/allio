const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const { JSDOM } = require('jsdom');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// CRITICAL FIX: Serve static files from the root directory for a flat structure on Vercel
app.use(express.static(path.join(__dirname, '')));

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

/**
 * SMART PROXY ENDPOINT
 * This is the core of our new download strategy.
 * Instead of relying on blocked third-party APIs, we act as a CORS proxy
 * to fetch the raw HTML of a video page. The frontend then parses this HTML
 * to extract download URLs and metadata.
 */
app.post('/api/fetch-page', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }

        // Check cache
        const cacheKey = `page_${url}`;
        const cached = getCache(cacheKey);
        if (cached) {
            console.log('Returning cached page content for:', url);
            return res.json({ html: cached });
        }

        console.log('Fetching page via proxy for:', url);

        // Fetch the page with browser-like headers to avoid blocks
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            }
        });

        if (!response.ok) {
            console.error(`Proxy fetch failed for ${url}: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ error: `Failed to fetch page: ${response.status}` });
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/html')) {
            console.error(`Proxy fetch for ${url} returned non-HTML content-type: ${contentType}`);
            return res.status(400).json({ error: 'URL did not return an HTML page. May be a direct link or blocked.' });
        }

        const html = await response.text();
        
        // Cache the successful result
        setCache(cacheKey, html);

        console.log(`Successfully fetched and cached page for ${url}`);
        res.json({ html: html });

    } catch (error) {
        console.error('Proxy fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch page via proxy',
            message: error.message 
        });
    }
});


/**
 * Get video info endpoint.
 * This endpoint now primarily uses YouTube oEmbed for reliable metadata.
 * It acts as a proxy for the oEmbed request to bypass CORS.
 */
app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }
        
        console.log('Fetching video info for:', url);
        
        // Check cache
        const cacheKey = `info_${url}`;
        const cached = getCache(cacheKey);
        if (cached) {
            console.log('Returning cached video info');
            return res.json(cached);
        }

        let data = null;
        const platform = detectPlatform(url);

        // For YouTube, try oEmbed FIRST for reliability
        if (platform === 'youtube') {
            try {
                console.log('Trying YouTube oEmbed for metadata');
                const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
                const oembedResponse = await fetch(oembedUrl);
                
                if (oembedResponse.ok) {
                    const oembedData = await oembedResponse.json();
                    // Add dummy file size info for format options
                    data = {
                        title: oembedData.title,
                        uploader: oembedData.author_name,
                        thumbnail: oembedData.thumbnail_url,
                        // Add dummy file size info for format options
                        formats: [
                            { format: 'mp4', quality: '1080', fileSize: null },
                            { format: 'mp4', quality: '720', fileSize: null },
                            { format: 'mp4', quality: '480', fileSize: null },
                            { format: 'mp3', quality: '320', fileSize: null }
                        ]
                    };
                    console.log('YouTube oEmbed success:', data);
                } else {
                    throw new Error(`YouTube oEmbed request failed: ${oembedResponse.status}`);
                }
            } catch (oembedError) {
                console.warn('YouTube oEmbed failed. The frontend will handle direct extraction.', oembedError.message);
                // We don't fail here. The frontend will use the /api/fetch-page endpoint.
                // We return a minimal response to indicate the process should continue.
                data = { status: 'frontend_extraction_required' };
            }
        } else {
            // For other platforms, we also defer to the frontend's direct extraction.
            data = { status: 'frontend_extraction_required' };
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

// Proxy endpoint for external APIs (to avoid CORS) - Kept for flexibility
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
║   Strategy: Smart Proxy + Frontend    ║
╚════════════════════════════════════════╝
        `);
    });
}

// Export for Vercel
module.exports = app;
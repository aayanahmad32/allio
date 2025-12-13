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

// Get video info (proxy to avoid CORS)
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

        // CRITICAL FIX: For YouTube, try oEmbed FIRST for reliability
        if (detectPlatform(url) === 'youtube') {
            try {
                console.log('Trying YouTube oEmbed first');
                const oembedData = await fetchYouTubeOEmbed(url);
                if (oembedData) {
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
                }
            } catch (oembedError) {
                console.warn('YouTube oEmbed failed, falling back to Cobalt:', oembedError.message);
            }
        }

        // If oEmbed failed or it's not a YouTube URL, use Cobalt as a fallback
        if (!data) {
            console.log('Using Cobalt API as fallback');
            const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
                method: 'POST',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url,
                    vCodec: 'h264',
                    vQuality: '720' // Default quality for info
                })
            });
            
            if (!cobaltResponse.ok) {
                throw new Error(`Cobalt API request failed: ${cobaltResponse.status}`);
            }
            
            data = await cobaltResponse.json();
            console.log('Cobalt API response:', data);
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
        
        console.log('Download request:', { url, quality, isAudio });
        
        // Check cache
        const cacheKey = `dl_${url}_${quality}_${isAudio}`;
        const cached = getCache(cacheKey);
        if (cached) {
            console.log('Returning cached download link');
            return res.json(cached);
        }
        
        // CRITICAL FIX: Added proper headers to mimic a real browser
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Origin': 'https://cobalt.tools',
                'Referer': 'https://cobalt.tools/'
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
        
        console.log('Cobalt download response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cobalt download error response:', errorText);
            throw new Error(`Download request failed: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Cobalt download data:', data);
        
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

// FIXED: Multiple API download endpoint with retry logic
app.post('/api/download-multi', async (req, res) => {
    try {
        const { url, quality = '720', isAudio = false } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }
        
        console.log('Multi-API download request:', { url, quality, isAudio });
        
        // Check cache
        const cacheKey = `dl_multi_${url}_${quality}_${isAudio}`;
        const cached = getCache(cacheKey);
        if (cached) {
            console.log('Returning cached download link');
            return res.json(cached);
        }
        
        // Define multiple APIs to try
        const apis = [
            {
                name: 'Cobalt',
                url: 'https://api.cobalt.tools/api/json',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Origin': 'https://cobalt.tools',
                    'Referer': 'https://cobalt.tools/'
                }
            },
            {
                name: 'AllTube',
                url: `https://api.alltubedownload.com/api/info?url=${encodeURIComponent(url)}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                }
            },
            {
                name: 'Y2Mate',
                url: 'https://www.y2mate.com/mates/analyzeV2/ajax',
                method: 'POST',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        ];
        
        let lastError = null;
        let result = null;
        
        // Try each API until one succeeds
        for (let i = 0; i < apis.length; i++) {
            const api = apis[i];
            
            try {
                console.log(`Trying API ${i + 1}: ${api.name}`);
                
                let response;
                
                if (api.name === 'Cobalt') {
                    response = await fetch(api.url, {
                        method: 'POST',
                        headers: api.headers,
                        body: JSON.stringify({
                            url: url,
                            vCodec: 'h264',
                            vQuality: quality,
                            aFormat: 'mp3',
                            isAudioOnly: isAudio,
                            filenamePattern: 'pretty'
                        })
                    });
                } else if (api.name === 'AllTube') {
                    response = await fetch(api.url, {
                        method: 'GET',
                        headers: api.headers
                    });
                } else if (api.name === 'Y2Mate') {
                    const formData = new URLSearchParams();
                    formData.append('k_query', url);
                    formData.append('k_page', 'home');
                    
                    response = await fetch(api.url, {
                        method: 'POST',
                        headers: api.headers,
                        body: formData
                    });
                }
                
                const text = await response.text();
                
                // Check if response is HTML (error) or JSON (success)
                if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                    throw new Error(`${api.name} API blocked by Cloudflare`);
                }
                
                if (!response.ok) {
                    throw new Error(`${api.name} API error: ${response.status}`);
                }
                
                const data = JSON.parse(text);
                
                if (api.name === 'Cobalt' && (data.status === 'error' || data.status === 'rate-limit')) {
                    throw new Error(data.text || 'Cobalt API error');
                }
                
                if (api.name === 'AllTube' && (!data.formats || data.formats.length === 0)) {
                    throw new Error('No formats found in AllTube response');
                }
                
                if (api.name === 'Y2Mate' && (!data.links || !data.links.mp4)) {
                    throw new Error('No download links found in Y2Mate response');
                }
                
                // Process successful response
                if (api.name === 'AllTube') {
                    // Find best format
                    const selectedFormat = data.formats?.find(f => 
                        f.qualityLabel && f.qualityLabel.includes(quality)
                    ) || data.formats?.[0];
                    
                    if (selectedFormat) {
                        result = {
                            url: selectedFormat.url,
                            title: data.title,
                            filename: data.title,
                            filesize: selectedFormat.filesize,
                            api: api.name
                        };
                    }
                } else if (api.name === 'Y2Mate') {
                    // Find best quality
                    const qualityKey = `${quality}p`;
                    let videoLink = data.links.mp4?.[qualityKey] || 
                                   data.links.mp4?.['360p'] || 
                                   Object.values(data.links.mp4 || {})[0];
                    
                    if (videoLink) {
                        result = {
                            url: videoLink[0]?.k || videoLink,
                            title: data.title,
                            filename: data.title,
                            api: api.name
                        };
                    }
                } else {
                    // Cobalt response
                    result = {
                        ...data,
                        api: api.name
                    };
                }
                
                if (result && result.url) {
                    console.log(`Success with ${api.name} API`);
                    break;
                }
                
            } catch (error) {
                lastError = error;
                console.warn(`${api.name} API failed:`, error.message);
                continue;
            }
        }
        
        if (!result) {
            throw new Error(`All APIs failed. Last error: ${lastError?.message || 'Unknown error'}`);
        }
        
        // Try to get file size
        if (result.url) {
            try {
                const headResponse = await fetch(result.url, { method: 'HEAD' });
                if (headResponse.ok) {
                    const contentLength = headResponse.headers.get('content-length');
                    if (contentLength) {
                        result.fileSize = parseInt(contentLength);
                    }
                }
            } catch (e) {
                console.warn('Could not fetch file size:', e);
            }
        }
        
        // Cache result
        setCache(cacheKey, result);
        
        res.json(result);
        
    } catch (error) {
        console.error('Multi-API download error:', error);
        res.status(500).json({ 
            error: 'Download failed',
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

// CRITICAL FIX: Helper function for YouTube oEmbed
async function fetchYouTubeOEmbed(url) {
    console.log('Fetching YouTube oEmbed for:', url);
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!response.ok) {
        throw new Error(`YouTube oEmbed request failed with status: ${response.status}`);
    }
    const data = await response.json();
    console.log('YouTube oEmbed response:', data);
    return data;
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
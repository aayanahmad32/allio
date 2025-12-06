// ===== ALLIO PRO SERVER - SIMPLIFIED FOR VERCEL =====

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
        timestamp: new Date().toISOString()
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
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                vCodec: 'h264',
                vQuality: '720',
                filenamePattern: 'basic'
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
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
                'Accept': 'application/json'
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
            throw new Error('Download request failed');
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

// Stats endpoint
app.get('/api/stats', (req, res) => {
    res.json({
        cacheSize: cache.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
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

// Start server (only if not in Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════╗
║   ALLIO PRO SERVER RUNNING            ║
║   Port: ${PORT}                      ║
║   Environment: ${process.env.NODE_ENV || 'development'}     ║
╚════════════════════════════════════════╝
        `);
    });
}

// Export for Vercel
module.exports = app;
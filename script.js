// ===== ALLIO PRO - FRONTEND SCRIPT =====
// Handles all UI logic, API calls, and user interactions.

// Configuration
const CONFIG = {
    apis: {
        download: '/api/download',
        videoInfo: '/api/video-info',
        metadata: '/api/youtube-metadata',
        proxy: '/api/proxy'
    },
    // Multiple download APIs for retry logic
    downloadAPIs: [
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
            url: 'https://api.alltubedownload.com/api/info',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        },
        {
            name: 'Y2Mate',
            url: 'https://www.y2mate.com/mates/analyzeV2/ajax',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    ]
};

// State Management
let appState = {
    currentVideo: null,
    selectedFormat: 'mp4',
    selectedQuality: '720',
    downloadHistory: JSON.parse(localStorage.getItem('downloadHistory') || '[]'),
    videoInfo: null,
    isProcessing: false,
    retryCount: 0,
    maxRetries: 3
};

// DOM Elements
const elements = {
    input: document.getElementById('inputUrl'),
    downloadBtn: document.getElementById('downloadBtn'),
    pasteBtn: document.getElementById('pasteBtn'),
    videoSection: document.getElementById('videoDetailsSection'),
    downloadSection: document.getElementById('downloadSection'),
    publicLinkSection: document.getElementById('publicLinkSection'),
    historySection: document.getElementById('downloadHistorySection'),
    spinner: document.getElementById('loadingSpinner'),
    loadingText: document.getElementById('loadingText'),
    notification: document.getElementById('notification'),
    downloadVideoBtn: document.getElementById('downloadVideoBtn')
};

// ===== UTILITY FUNCTIONS =====

function showSpinner(show = true, text = 'Loading...') {
    if (elements.spinner) {
        elements.spinner.classList.toggle('show', show);
        if (elements.loadingText) {
            elements.loadingText.textContent = text;
        }
    }
}

function showNotification(title, message, type = 'success') {
    const notif = elements.notification;
    if (!notif) return;
    
    const titleEl = notif.querySelector('.notification-title');
    const messageEl = notif.querySelector('.notification-message');
    const icon = notif.querySelector('.notification-icon i');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    if (icon) {
        icon.className = type === 'success' ? 'fas fa-check' : 'fas fa-exclamation-triangle';
    }
    
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

function hideAllSections() {
    const sections = [
        elements.videoSection, 
        elements.downloadSection, 
        elements.publicLinkSection, 
        elements.historySection
    ];
    
    sections.forEach(el => {
        if (el) el.classList.add('hidden');
    });
}

function showSection(section) {
    if (section) {
        hideAllSections();
        section.classList.remove('hidden');
    }
}

// Format file size in human-readable format
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return 'Unknown size';
    
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

// Sleep function for delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== PLATFORM DETECTION =====

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

// ===== URL VALIDATION =====

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

function validateAndProcessUrl(url) {
    if (!isValidUrl(url)) {
        throw new Error('Invalid URL format. Please enter a valid URL.');
    }
    
    const platform = detectPlatform(url);
    if (platform === 'unknown') {
        throw new Error('Platform not supported. Supported platforms: YouTube, Instagram, TikTok, Facebook, Twitter, etc.');
    }
    
    return { url, platform };
}

// ===== CORE DOWNLOAD FUNCTIONALITY =====

async function fetchVideoInfo(url) {
    try {
        console.log('Fetching video info for:', url);
        
        // Try YouTube oEmbed first (most reliable)
        if (detectPlatform(url) === 'youtube') {
            try {
                const videoId = extractYouTubeId(url);
                if (videoId) {
                    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
                    const response = await fetch(oembedUrl);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('YouTube oEmbed success:', data);
                        
                        return {
                            title: data.title,
                            uploader: data.author_name,
                            thumbnail: data.thumbnail_url,
                            // Add dummy file size info for format options
                            formats: [
                                { format: 'mp4', quality: '1080', fileSize: null },
                                { format: 'mp4', quality: '720', fileSize: null },
                                { format: 'mp4', quality: '480', fileSize: null },
                                { format: 'mp3', quality: '320', fileSize: null }
                            ]
                        };
                    }
                }
            } catch (oembedError) {
                console.warn('YouTube oEmbed failed, trying backend:', oembedError.message);
            }
        }
        
        // Fallback to backend API
        const response = await fetch(CONFIG.apis.videoInfo, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        console.log('Video info response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Video info error response:', errorText);
            throw new Error(`Failed to fetch video info: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Video info data:', data);
        
        return data;
    } catch (error) {
        console.error('Video info fetch error:', error);
        return null;
    }
}

// ===== DOWNLOAD WITH RETRY LOGIC =====

async function downloadWithRetry(url, format, quality, isAudio) {
    let lastError = null;
    
    for (let i = 0; i < CONFIG.downloadAPIs.length; i++) {
        const api = CONFIG.downloadAPIs[i];
        
        try {
            showSpinner(true, `Trying ${api.name} API (${i + 1}/${CONFIG.downloadAPIs.length})...`);
            
            console.log(`Trying API ${i + 1}: ${api.name}`);
            
            let result;
            
            if (api.name === 'Cobalt') {
                result = await tryCobaltAPI(url, format, quality, isAudio, api);
            } else if (api.name === 'AllTube') {
                result = await tryAllTubeAPI(url, format, quality, isAudio, api);
            } else if (api.name === 'Y2Mate') {
                result = await tryY2MateAPI(url, format, quality, isAudio, api);
            }
            
            if (result && result.url) {
                showSpinner(false);
                showNotification('Success', `Download link generated using ${api.name}!`);
                return result;
            }
            
        } catch (error) {
            lastError = error;
            console.warn(`${api.name} API failed:`, error.message);
            
            if (i < CONFIG.downloadAPIs.length - 1) {
                await sleep(2000); // Wait 2 seconds before trying next API
            }
        }
    }
    
    showSpinner(false);
    throw new Error(`All download APIs failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// ===== API IMPLEMENTATIONS =====

async function tryCobaltAPI(url, format, quality, isAudio, api) {
    const response = await fetch(api.url, {
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
    
    const text = await response.text();
    
    // Check if response is HTML (error) or JSON (success)
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error('Cobalt API blocked by Cloudflare');
    }
    
    if (!response.ok) {
        throw new Error(`Cobalt API error: ${response.status}`);
    }
    
    const data = JSON.parse(text);
    
    if (data.status === 'error' || data.status === 'rate-limit') {
        throw new Error(data.text || 'Cobalt API error');
    }
    
    return data;
}

async function tryAllTubeAPI(url, format, quality, isAudio, api) {
    const response = await fetch(`${api.url}?url=${encodeURIComponent(url)}`, {
        headers: api.headers
    });
    
    if (!response.ok) {
        throw new Error(`AllTube API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Find the best format based on requested quality
    let selectedFormat = data.formats?.find(f => 
        f.qualityLabel && f.qualityLabel.includes(quality)
    ) || data.formats?.[0];
    
    if (!selectedFormat) {
        throw new Error('No suitable format found');
    }
    
    return {
        url: selectedFormat.url,
        title: data.title,
        filename: data.title,
        filesize: selectedFormat.filesize
    };
}

async function tryY2MateAPI(url, format, quality, isAudio, api) {
    // Step 1: Analyze video
    const formData = new FormData();
    formData.append('k_query', url);
    formData.append('k_page', 'home');
    
    const analyzeResponse = await fetch(api.url, {
        method: 'POST',
        headers: api.headers,
        body: formData
    });
    
    if (!analyzeResponse.ok) {
        throw new Error(`Y2Mate analyze error: ${analyzeResponse.status}`);
    }
    
    const analyzeData = await analyzeResponse.json();
    
    if (!analyzeData.links) {
        throw new Error('No download links found');
    }
    
    // Find the best quality
    const qualityKey = `${quality}p`;
    let videoLink = analyzeData.links.mp4?.[qualityKey] || 
                   analyzeData.links.mp4?.['360p'] || 
                   Object.values(analyzeData.links.mp4 || {})[0];
    
    if (!videoLink) {
        throw new Error('No suitable quality found');
    }
    
    return {
        url: videoLink[0]?.k || videoLink,
        title: analyzeData.title,
        filename: analyzeData.title
    };
}

// ===== VIDEO DETAILS =====

async function loadVideoDetails(url) {
    if (appState.isProcessing) return;
    
    showSpinner(true, 'Analyzing URL...');
    appState.isProcessing = true;
    
    try {
        const { url: validatedUrl, platform } = validateAndProcessUrl(url);
        
        appState.currentVideo = {
            url: validatedUrl,
            platform: platform,
            title: 'Loading...',
            thumbnail: 'https://via.placeholder.com/800x450?text=Video',
            author: 'Unknown'
        };
        
        // Fetch video info
        const videoInfo = await fetchVideoInfo(validatedUrl);
        appState.videoInfo = videoInfo;
        
        if (videoInfo) {
            appState.currentVideo.title = videoInfo.title || videoInfo.filename || 'Video';
            appState.currentVideo.thumbnail = videoInfo.thumbnail || appState.currentVideo.thumbnail;
            appState.currentVideo.author = videoInfo.uploader || videoInfo.channel || 'Unknown';
        }
        
        displayVideoDetails();
        showSection(elements.videoSection);
        showNotification('Success', 'Video loaded successfully!');
        
    } catch (error) {
        console.error('Load video details error:', error);
        showErrorModal(error.message);
        showSection(elements.downloadSection);
    } finally {
        showSpinner(false);
        appState.isProcessing = false;
    }
}

function displayVideoDetails() {
    const video = appState.currentVideo;
    
    console.log('Displaying video details:', video);
    
    const thumbnail = document.getElementById('videoThumbnail');
    const title = document.getElementById('videoTitle');
    const channel = document.getElementById('videoChannel');
    const views = document.getElementById('videoViews');
    const duration = document.getElementById('videoDuration');
    const uploadDate = document.getElementById('videoUploadDate');
    const description = document.getElementById('videoDescription');
    
    // Update thumbnail
    if (thumbnail) {
        thumbnail.src = video.thumbnail;
        thumbnail.onerror = function() {
            this.src = 'https://via.placeholder.com/800x450?text=Video';
        };
    }
    
    // Update text content
    if (title) title.textContent = video.title;
    if (channel) channel.textContent = video.author;
    
    // Update metadata with fallbacks
    if (views) {
        const viewCount = appState.videoInfo?.views || 'N/A';
        views.textContent = typeof viewCount === 'number' ? viewCount.toLocaleString() + ' views' : viewCount;
    }
    
    if (duration) {
        const durationText = appState.videoInfo?.duration || 'N/A';
        duration.textContent = durationText;
    }
    
    if (uploadDate) {
        const uploadText = appState.videoInfo?.uploadDate || 'N/A';
        uploadDate.textContent = uploadText;
    }
    
    if (description) {
        const descText = appState.videoInfo?.description || 'No description available.';
        description.textContent = descText;
    }
    
    // Generate format options
    generateFormatOptions();
}

function generateFormatOptions() {
    const container = document.getElementById('formatOptions');
    if (!container) return;
    
    console.log('Generating format options with video info:', appState.videoInfo);
    
    // Default formats with estimated sizes
    const formats = [
        { format: 'mp4', quality: '1080', label: '1080p Full HD', size: '~68 MB' },
        { format: 'mp4', quality: '720', label: '720p HD', size: '~35 MB' },
        { format: 'mp4', quality: '480', label: '480p SD', size: '~18 MB' },
        { format: 'mp3', quality: '320', label: 'MP3 Audio', size: '~8 MB' }
    ];
    
    // Update with real file sizes if available
    if (appState.videoInfo && appState.videoInfo.formats) {
        formats.forEach(f => {
            const formatInfo = appState.videoInfo.formats.find(
                fmt => fmt.format === f.format && fmt.quality === f.quality
            );
            
            if (formatInfo && formatInfo.fileSize) {
                f.size = formatFileSize(formatInfo.fileSize);
            }
        });
    }
    
    container.innerHTML = formats.map((f, i) => `
        <div class="format-option ${i === 1 ? 'selected' : ''}" onclick="selectFormat('${f.format}', '${f.quality}', this)">
            <div class="format-info">
                <span class="format-name">${f.label}</span>
                <span class="format-size">${f.size}</span>
            </div>
            <input type="radio" name="format" value="${f.format}-${f.quality}" ${i === 1 ? 'checked' : ''}>
        </div>
    `).join('');
    
    // Set default selection
    appState.selectedFormat = 'mp4';
    appState.selectedQuality = '720';
}

function selectFormat(format, quality, element) {
    console.log('Selecting format:', format, 'quality:', quality);
    
    // Remove selected class from all options
    document.querySelectorAll('.format-option').forEach(el => el.classList.remove('selected'));
    
    // Add selected class to clicked element
    element.classList.add('selected');
    
    // Update appState
    appState.selectedFormat = format;
    appState.selectedQuality = quality;
    
    // Check the radio button
    const radio = element.querySelector('input[type="radio"]');
    if (radio) {
        radio.checked = true;
    }
    
    console.log('Selected format:', format, 'quality:', quality);
}

// ===== DOWNLOAD LINK GENERATION =====

async function generateDownloadLink() {
    if (appState.isProcessing) return;
    
    const btn = elements.downloadVideoBtn;
    if (!btn || !appState.currentVideo) return;
    
    // Show loading state
    btn.classList.add('loading');
    btn.disabled = true;
    appState.isProcessing = true;
    
    try {
        const isAudio = appState.selectedFormat === 'mp3';
        
        console.log('Generating download link with params:', {
            url: appState.currentVideo.url,
            quality: appState.selectedQuality,
            isAudio: isAudio
        });
        
        // Use retry logic with multiple APIs
        const downloadData = await downloadWithRetry(
            appState.currentVideo.url,
            appState.selectedFormat,
            appState.selectedQuality,
            isAudio
        );
        
        console.log('Download data:', downloadData);
        
        // Try to get file size
        if (downloadData && downloadData.url) {
            try {
                const headResponse = await fetch(downloadData.url, { method: 'HEAD' });
                if (headResponse.ok) {
                    const contentLength = headResponse.headers.get('content-length');
                    if (contentLength) {
                        downloadData.fileSize = parseInt(contentLength);
                    }
                }
            } catch (e) {
                console.warn('Could not fetch file size:', e);
            }
        }
        
        // Save to history
        const historyItem = {
            id: Date.now(),
            title: appState.currentVideo.title,
            platform: appState.currentVideo.platform,
            format: appState.selectedFormat,
            quality: appState.selectedQuality,
            url: downloadData.url,
            timestamp: Date.now()
        };
        
        appState.downloadHistory.unshift(historyItem);
        localStorage.setItem('downloadHistory', JSON.stringify(appState.downloadHistory.slice(0, 50)));
        
        // Display download link
        displayPublicLink(historyItem);
        showNotification('Success', 'Download link generated!');
        
    } catch (error) {
        console.error('Download error:', error);
        showErrorModal(error.message);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
        appState.isProcessing = false;
    }
}

function displayPublicLink(item) {
    const title = document.getElementById('downloadTitle');
    const platform = document.getElementById('downloadPlatform');
    const formatQuality = document.getElementById('downloadFormatQuality');
    const linkInput = document.getElementById('publicLinkInput');
    
    if (title) title.textContent = item.title;
    if (platform) platform.textContent = item.platform.toUpperCase();
    if (formatQuality) formatQuality.textContent = `${item.format.toUpperCase()} • ${item.quality}p`;
    if (linkInput) linkInput.value = item.url;
    
    showSection(elements.publicLinkSection);
}

// ===== INPUT PROCESSING =====

async function startDownload() {
    const input = elements.input.value.trim();
    
    if (!input) {
        showNotification('Error', 'Please enter a video URL', 'error');
        return;
    }
    
    await loadVideoDetails(input);
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (elements.input) {
            elements.input.value = text;
            showNotification('Success', 'URL pasted!');
            // Automatically process after pasting
            await startDownload();
        }
    } catch (err) {
        console.error('Clipboard error:', err);
        showNotification('Error', 'Could not access clipboard', 'error');
    }
}

// ===== UI ACTIONS =====

function copyPublicLink() {
    const input = document.getElementById('publicLinkInput');
    if (input) {
        input.select();
        document.execCommand('copy');
        showNotification('Success', 'Link copied!');
    }
}

function triggerDirectDownload() {
    const url = document.getElementById('publicLinkInput')?.value;
    if (url) {
        window.open(url, '_blank');
        showNotification('Success', 'Download started!');
    }
}

function shareDownloadLink() {
    const url = document.getElementById('publicLinkInput')?.value;
    if (url && navigator.share) {
        navigator.share({
            title: 'Check out this video!',
            url: url
        });
    } else if (url) {
        copyPublicLink();
    }
}

// ===== ERROR HANDLING =====

function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    const errorTitle = document.getElementById('errorTitle');
    const errorMessage = document.getElementById('errorMessage');
    
    if (modal && errorTitle && errorMessage) {
        errorTitle.textContent = 'Download Failed';
        errorMessage.textContent = message || 'Unable to download video. Please try again later.';
        
        modal.classList.add('show');
    }
}

function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function retryDownload() {
    closeErrorModal();
    if (appState.currentVideo) {
        generateDownloadLink();
    }
}

// ===== HISTORY MANAGEMENT =====

function loadHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    if (appState.downloadHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-download"></i>
                <p>No download history yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appState.downloadHistory.map(item => `
        <div class="history-item">
            <div class="history-thumbnail">
                <i class="fab fa-${item.platform}"></i>
            </div>
            <div class="history-details">
                <div class="history-title">${item.title}</div>
                <div class="history-meta">
                    <span><i class="fas fa-globe"></i> ${item.platform}</span>
                    <span><i class="fas fa-file"></i> ${item.format}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="history-btn download" onclick="window.open('${item.url}', '_blank')">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="history-btn delete" onclick="deleteHistoryItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function showDownloadHistory() {
    loadHistory();
    showSection(elements.historySection);
}

function deleteHistoryItem(id) {
    appState.downloadHistory = appState.downloadHistory.filter(item => item.id !== id);
    localStorage.setItem('downloadHistory', JSON.stringify(appState.downloadHistory));
    loadHistory();
    showNotification('Success', 'Item deleted');
}

function clearDownloadHistory() {
    if (confirm('Clear all download history?')) {
        appState.downloadHistory = [];
        localStorage.removeItem('downloadHistory');
        loadHistory();
        showNotification('Success', 'History cleared');
    }
}

// ===== UI ACTIONS =====

function toggleMenu() {
    const menu = document.getElementById('menu');
    if (menu) menu.classList.toggle('show');
}

function toggleLangDropdown() {
    const dropdown = document.getElementById('langDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function closeVideoDetails() {
    showSection(elements.downloadSection);
}

// ===== THEME & LANGUAGE =====

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showNotification('Theme Changed', `Switched to ${newTheme} mode`);
}

function changeLanguage(lang) {
    const langNames = { en: 'English', hi: 'हिन्दी', es: 'Español' };
    const currentLang = document.getElementById('currentLang');
    const dropdown = document.getElementById('langDropdown');
    
    if (currentLang) currentLang.textContent = lang.toUpperCase();
    if (dropdown) dropdown.classList.remove('show');
    showNotification('Language Changed', `Switched to ${langNames[lang]}`);
    localStorage.setItem('language', lang);
}

// ===== MODALS & SETTINGS =====

function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('show');
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('show');
}

function savePlatformSettings() {
    const settings = {};
    ['youtube', 'instagram', 'tiktok', 'streamnet', 'diskwala'].forEach(platform => {
        const format = document.getElementById(`${platform}-format`)?.value;
        const quality = document.getElementById(`${platform}-quality`)?.value;
        if (format && quality) {
            settings[platform] = { format, quality };
        }
    });
    localStorage.setItem('platformSettings', JSON.stringify(settings));
    closeSettings();
    showNotification('Settings Saved', 'Platform settings have been saved');
}

function resetDefaultSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
        localStorage.removeItem('theme');
        localStorage.removeItem('language');
        localStorage.removeItem('platformSettings');
        location.reload();
    }
}

function showPage(page) {
    const pages = {
        about: {
            title: 'About Us',
            content: `
                <div class="page-content">
                    <h3>About ALLIO PRO</h3>
                    <p>ALLIO PRO is a premium global media downloader developed by LoopLabs Tech. We provide high-quality video and audio downloads from all major social media platforms.</p>
                    
                    <h3>Our Mission</h3>
                    <p>Our mission is to provide the best possible media downloading experience with cutting-edge technology and a user-friendly interface.</p>
                    
                    <h3>Why Choose ALLIO PRO?</h3>
                    <ul>
                        <li>Support for 20+ platforms</li>
                        <li>8K video downloads</li>
                        <li>Embedded lyrics in audio files</li>
                        <li>Lightning-fast download speeds</li>
                        <li>Completely free to use</li>
                        <li>No registration required</li>
                    </ul>
                </div>
            `
        },
        contact: {
            title: 'Contact Us',
            content: `
                <div class="page-content">
                    <h3>Get in Touch</h3>
                    <p>We'd love to hear from you! Whether you have a question, feedback, or just want to say hello, feel free to reach out to us.</p>
                    
                    <h3>Contact Information</h3>
                    <p><strong>Email:</strong> support@looplabstech.com</p>
                    <p><strong>Instagram:</strong> @looplabstech</p>
                    <p><strong>Business Hours:</strong> Monday - Friday, 9AM - 6PM IST</p>
                </div>
            `
        },
        privacy: {
            title: 'Privacy Policy',
            content: `
                <div class="page-content">
                    <h3>Privacy Policy</h3>
                    <p>At ALLIO PRO, we take your privacy seriously. This policy outlines how we collect, use, and protect your information.</p>
                    
                    <h3>Information We Collect</h3>
                    <ul>
                        <li>URLs you submit for downloading</li>
                        <li>Device information (browser type, IP address)</li>
                        <li>Usage data and analytics</li>
                    </ul>
                </div>
            `
        },
        faq: {
            title: 'Frequently Asked Questions',
            content: `
                <div class="page-content">
                    <h3>General Questions</h3>
                    
                    <h4>What is ALLIO PRO?</h4>
                    <p>ALLIO PRO is a free online tool that allows you to download videos and music from various social media platforms.</p>
                    
                    <h4>Is ALLIO PRO free to use?</h4>
                    <p>Yes, ALLIO PRO is completely free to use with no hidden charges or subscription fees.</p>
                    
                    <h4>Which platforms are supported?</h4>
                    <p>We support YouTube, Instagram, TikTok, Facebook, Twitter, Telegram, Reddit, Pinterest, Vimeo, Dailymotion, SoundCloud, and more.</p>
                </div>
            `
        }
    };
    
    const pageData = pages[page];
    if (pageData) {
        const modal = document.getElementById('pageModal');
        const title = document.getElementById('pageModalTitle');
        const content = document.getElementById('pageModalContent');
        
        if (modal && title && content) {
            title.textContent = pageData.title;
            content.innerHTML = pageData.content;
            modal.classList.add('show');
        }
    }
}

function closePageModal() {
    const modal = document.getElementById('pageModal');
    if (modal) modal.classList.remove('show');
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'ALLIO PRO - Premium Media Downloader',
            text: 'Check out this amazing media downloader!',
            url: window.location.origin
        });
    } else {
        showPage('share');
        const modal = document.getElementById('pageModal');
        const title = document.getElementById('pageModalTitle');
        const content = document.getElementById('pageModalContent');
        
        if (modal && title && content) {
            title.textContent = 'Share ALLIO PRO';
            content.innerHTML = `
                <div class="page-content">
                    <h3>Share with Friends</h3>
                    <p>Help your friends discover the best media downloader!</p>
                    
                    <div class="share-options">
                        <button class="share-btn whatsapp" onclick="shareViaWhatsApp()">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>
                        <button class="share-btn telegram" onclick="shareViaTelegram()">
                            <i class="fab fa-telegram"></i> Telegram
                        </button>
                        <button class="share-btn copy" onclick="copyShareLink()">
                            <i class="fas fa-copy"></i> Copy Link
                        </button>
                    </div>
                </div>
            `;
            modal.classList.add('show');
        }
    }
}

function shareViaWhatsApp() {
    const text = "Check out ALLIO PRO - The ultimate media downloader! " + window.location.origin;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    showNotification('Sharing', 'Opening WhatsApp...');
}

function shareViaTelegram() {
    const text = "Check out ALLIO PRO - The ultimate media downloader! " + window.location.origin;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`, '_blank');
    showNotification('Sharing', 'Opening Telegram...');
}

function copyShareLink() {
    navigator.clipboard.writeText(window.location.origin).then(() => {
        showNotification('Link Copied', 'Share link copied to clipboard!');
    });
}

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', () => {
    console.log('ALLIO PRO v1.0.40 - Application loaded');
    
    // Load saved preferences
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
        const currentLang = document.getElementById('currentLang');
        if (currentLang) currentLang.textContent = savedLang.toUpperCase();
    }
    
    // Download button
    if (elements.downloadBtn) {
        elements.downloadBtn.addEventListener('click', startDownload);
    }
    
    // Paste button
    if (elements.pasteBtn) {
        elements.pasteBtn.addEventListener('click', pasteFromClipboard);
    }
    
    // Enter key on input
    if (elements.input) {
        elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startDownload();
        });
    }
    
    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-toggle')) {
            const dropdown = document.getElementById('langDropdown');
            if (dropdown) dropdown.classList.remove('show');
        }
        if (!e.target.closest('.menu-btn')) {
            const menu = document.getElementById('menu');
            if (menu) menu.classList.remove('show');
        }
    });
    
    // Close modals on outside click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('popup-overlay')) {
            e.target.classList.remove('show');
        }
    });
    
    // Simulate live download count updates
    setInterval(() => {
        const countEl = document.getElementById('downloadCount');
        if (countEl) {
            const count = parseInt(countEl.textContent.replace(/[^0-9]/g, ''));
            const increment = Math.floor(Math.random() * 5) + 1;
            countEl.textContent = `${(count + increment).toLocaleString()} Downloads Today`;
        }
    }, 30000);
});

// ===== GLOBAL FUNCTIONS =====
// Make functions globally available for onclick handlers
window.startDownload = startDownload;
window.pasteFromClipboard = pasteFromClipboard;
window.generateDownloadLink = generateDownloadLink;
window.selectFormat = selectFormat;
window.copyPublicLink = copyPublicLink;
window.triggerDirectDownload = triggerDirectDownload;
window.showDownloadHistory = showDownloadHistory;
window.deleteHistoryItem = deleteHistoryItem;
window.clearDownloadHistory = clearDownloadHistory;
window.toggleMenu = toggleMenu;
window.toggleLangDropdown = toggleLangDropdown;
window.closeVideoDetails = closeVideoDetails;
window.toggleTheme = toggleTheme;
window.changeLanguage = changeLanguage;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.savePlatformSettings = savePlatformSettings;
window.resetDefaultSettings = resetDefaultSettings;
window.showPage = showPage;
window.closePageModal = closePageModal;
window.shareApp = shareApp;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaTelegram = shareViaTelegram;
window.copyShareLink = copyShareLink;
window.closeErrorModal = closeErrorModal;
window.retryDownload = retryDownload;
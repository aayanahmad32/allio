// --- GLOBAL VARIABLES & CONFIGURATION ---
const APP_CONFIG = {
    name: 'ALLIO PRO',
    version: '2.0.0',
    apis: {
        cobalt: 'https://api.cobalt.tools/api/json',
        invidious: 'https://vid.puffyan.us/api/v1',
        youtubeOembed: 'https://www.youtube.com/oembed',
        corsProxy: 'https://corsproxy.io/?'
    },
    rateLimits: {
        cobalt: 20,
        invidious: 100
    },
    cache: {
        duration: 5 * 60 * 1000,
        maxSize: 50
    }
};

// --- STATE MANAGEMENT ---
let appState = {
    currentMode: 'video',
    currentPlatform: '',
    currentUrl: '',
    currentVideoData: {},
    selectedFormat: 'mp4',
    selectedQuality: '720p',
    downloadHistory: [],
    searchHistory: [],
    userSettings: {
        theme: 'dark',
        language: 'en',
        defaultQuality: '720p',
        defaultFormat: 'mp4',
        autoDownload: false,
        saveHistory: true
    },
    platformSettings: {
        youtube: { format: 'mp4', quality: '1080p' },
        instagram: { format: 'mp4', quality: '720p' },
        tiktok: { format: 'mp4', quality: '720p' },
        facebook: { format: 'mp4', quality: '720p' },
        twitter: { format: 'mp4', quality: '720p' },
        telegram: { format: 'mp4', quality: '720p' },
        soundcloud: { format: 'mp3', quality: '320' },
        spotify: { format: 'mp3', quality: '320' }
    },
    apiCallCount: {
        cobalt: 0,
        invidious: 0,
        lastReset: Date.now()
    },
    cache: new Map()
};

// --- DOM ELEMENTS ---
const elements = {
    inputUrl: document.getElementById('inputUrl'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    notification: document.getElementById('notification'),
    notificationTitle: document.getElementById('notificationTitle'),
    notificationMessage: document.getElementById('notificationMessage'),
    downloadCount: document.getElementById('downloadCount'),
    menu: document.getElementById('menu'),
    langDropdown: document.getElementById('langDropdown'),
    currentLang: document.getElementById('currentLang'),
    searchSection: document.getElementById('searchSection'),
    videoDetailsSection: document.getElementById('videoDetailsSection'),
    searchResultsSection: document.getElementById('searchResultsSection'),
    publicLinkSection: document.getElementById('publicLinkSection'),
    downloadHistorySection: document.getElementById('downloadHistorySection'),
    settingsModal: document.getElementById('settingsModal'),
    pageModal: document.getElementById('pageModal'),
    qrModal: document.getElementById('qrModal'),
    bottomSheet: document.getElementById('bottomSheet'),
    videoThumbnail: document.getElementById('videoThumbnail'),
    videoTitle: document.getElementById('videoTitle'),
    videoChannel: document.getElementById('videoChannel'),
    videoViews: document.getElementById('videoViews'),
    videoDuration: document.getElementById('videoDuration'),
    videoUploadDate: document.getElementById('videoUploadDate'),
    videoDescription: document.getElementById('videoDescription'),
    formatOptions: document.getElementById('formatOptions'),
    searchResultsContainer: document.getElementById('searchResultsContainer'),
    historyList: document.getElementById('historyList'),
    publicLinkInput: document.getElementById('publicLinkInput'),
    downloadTitle: document.getElementById('downloadTitle'),
    downloadPlatform: document.getElementById('downloadPlatform'),
    downloadFormat: document.getElementById('downloadFormat'),
    downloadQuality: document.getElementById('downloadQuality'),
    downloadSize: document.getElementById('downloadSize'),
    qrCodeContainer: document.getElementById('qrCodeContainer')
};

// --- UTILITY FUNCTIONS ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateUniqueId() {
    return 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').substring(0, 100);
}

function validateURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function formatViewCount(views) {
    const num = parseInt(views.toString().replace(/,/g, ''));
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return views.toString();
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function estimateFileSize(duration, quality, format) {
    const minutes = duration / 60;
    const sizeMap = {
        '2160p': { mp4: 12, webm: 10 },
        '1080p': { mp4: 6, webm: 5 },
        '720p': { mp4: 3, webm: 2.5 },
        '480p': { mp4: 1.5, webm: 1.2 },
        '360p': { mp4: 0.8, webm: 0.6 },
        '144p': { mp4: 0.3, webm: 0.2 },
        '320': { mp3: 2.4, m4a: 2.2, wav: 10 },
        '256': { mp3: 1.9, m4a: 1.8, wav: 8 },
        '192': { mp3: 1.4, m4a: 1.3, wav: 6 },
        '128': { mp3: 1, m4a: 0.9, wav: 4 }
    };
    
    const sizePerMinute = sizeMap[quality]?.[format] || 1;
    const estimatedBytes = minutes * sizePerMinute * 1024 * 1024;
    return formatFileSize(estimatedBytes);
}

// --- CACHE MANAGEMENT ---
function getCacheKey(url, options = {}) {
    return `${url}_${JSON.stringify(options)}`;
}

function getCachedData(key) {
    const cached = appState.cache.get(key);
    if (cached && Date.now() - cached.timestamp < APP_CONFIG.cache.duration) {
        return cached.data;
    }
    appState.cache.delete(key);
    return null;
}

function setCachedData(key, data) {
    if (appState.cache.size >= APP_CONFIG.cache.maxSize) {
        const firstKey = appState.cache.keys().next().value;
        appState.cache.delete(firstKey);
    }
    appState.cache.set(key, {
        data,
        timestamp: Date.now()
    });
}

// --- RATE LIMITING ---
function checkRateLimit(api) {
    const now = Date.now();
    const timeDiff = now - appState.apiCallCount.lastReset;
    
    if (timeDiff >= 60000) {
        appState.apiCallCount[api] = 0;
        appState.apiCallCount.lastReset = now;
    }
    
    return appState.apiCallCount[api] < APP_CONFIG.rateLimits[api];
}

function incrementApiCall(api) {
    appState.apiCallCount[api]++;
}

// --- PLATFORM DETECTION ---
function detectPlatform(url) {
    const platformPatterns = {
        youtube: /youtube\.com|youtu\.be/,
        instagram: /instagram\.com/,
        tiktok: /tiktok\.com/,
        facebook: /facebook\.com|fb\.watch/,
        twitter: /twitter\.com|x\.com/,
        telegram: /t\.me|telegram\.me/,
        reddit: /reddit\.com/,
        pinterest: /pinterest\.com/,
        vimeo: /vimeo\.com/,
        dailymotion: /dailymotion\.com/,
        soundcloud: /soundcloud\.com/,
        twitch: /twitch\.tv/
    };
    
    for (const [platform, pattern] of Object.entries(platformPatterns)) {
        if (pattern.test(url)) {
            return platform;
        }
    }
    
    return 'unknown';
}

// --- URL PARSING ---
function extractYouTubeVideoId(url) {
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

function extractInstagramShortcode(url) {
    const match = url.match(/instagram\.com\/(?:p|reel)\/([^?]+)/);
    return match ? match[1] : null;
}

function extractTikTokId(url) {
    const match = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
    return match ? match[1] : null;
}

// --- API INTEGRATION ---
async function fetchFromCobalt(url, options = {}) {
    if (!checkRateLimit('cobalt')) {
        throw new Error('Rate limit exceeded. Please wait and try again.');
    }
    
    incrementApiCall('cobalt');
    
    const requestBody = {
        url: url,
        vCodec: options.vCodec || 'h264',
        vQuality: options.vQuality || '720',
        aFormat: options.aFormat || 'mp3',
        filenamePattern: options.filenamePattern || 'pretty',
        isAudioOnly: options.isAudioOnly || false,
        isTTFullAudio: options.isTTFullAudio || false,
        isAudioMuted: options.isAudioMuted || false,
        dubLang: options.dubLang || false,
        disableMetadata: options.disableMetadata || false
    };
    
    try {
        const response = await fetch(APP_CONFIG.apis.corsProxy + encodeURIComponent(APP_CONFIG.apis.cobalt), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.text || 'Unknown error occurred');
        }
        
        return data;
    } catch (error) {
        console.error('Cobalt API error:', error);
        throw error;
    }
}

async function searchYouTube(query, options = {}) {
    if (!checkRateLimit('invidious')) {
        throw new Error('Search rate limit exceeded. Please wait and try again.');
    }
    
    incrementApiCall('invidious');
    
    const params = new URLSearchParams({
        q: query,
        type: 'video',
        page: options.page || 1,
        sort_by: options.sortBy || 'relevance'
    });
    
    if (options.date) params.append('date', options.date);
    if (options.duration) params.append('duration', options.duration);
    
    try {
        const response = await fetch(APP_CONFIG.apis.corsProxy + encodeURIComponent(`${APP_CONFIG.apis.invidious}/search?${params}`));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Invidious API error:', error);
        throw error;
    }
}

async function fetchYouTubeMetadata(videoId) {
    const cacheKey = `youtube_meta_${videoId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    
    try {
        const params = new URLSearchParams({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            format: 'json'
        });
        
        const response = await fetch(`${APP_CONFIG.apis.youtubeOembed}?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setCachedData(cacheKey, data);
        return data;
    } catch (error) {
        console.error('YouTube oEmbed error:', error);
        throw error;
    }
}

// --- UI FUNCTIONS ---
function showLoadingSpinner(show = true) {
    if (show) {
        elements.loadingSpinner.classList.add('show');
    } else {
        elements.loadingSpinner.classList.remove('show');
    }
}

function showNotification(title, message, type = 'success') {
    elements.notificationTitle.textContent = title;
    elements.notificationMessage.textContent = message;
    elements.notification.classList.add('show');
    
    // Update icon based on type
    const icon = elements.notification.querySelector('.notification-icon i');
    icon.className = type === 'success' ? 'fas fa-check' : 
                   type === 'error' ? 'fas fa-exclamation-triangle' : 
                   'fas fa-info-circle';
    
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 3000);
}

function hideSection(section) {
    section.classList.add('hidden');
}

function showSection(section) {
    section.classList.remove('hidden');
}

function updateDownloadCount() {
    const count = parseInt(elements.downloadCount.textContent.replace(/[^0-9]/g, '')) + 1;
    elements.downloadCount.textContent = `${count.toLocaleString()} Downloads Today`;
}

// --- CORE FUNCTIONS ---
async function processInput() {
    const input = elements.inputUrl.value.trim();
    if (!input) {
        showNotification('Error', 'Please enter a URL or search term', 'error');
        return;
    }
    
    const isUrl = /^https?:\/\/.+/i.test(input);
    
    if (isUrl) {
        if (!validateURL(input)) {
            showNotification('Error', 'Please enter a valid URL', 'error');
            return;
        }
        
        appState.currentUrl = input;
        appState.currentPlatform = detectPlatform(input);
        
        if (appState.currentPlatform === 'unknown') {
            showNotification('Error', 'This platform is not supported yet', 'error');
            return;
        }
        
        await fetchVideoDetails(input);
    } else {
        await searchVideos(input);
    }
}

async function fetchVideoDetails(url) {
    showLoadingSpinner(true);
    
    try {
        const platform = detectPlatform(url);
        let videoData = {};
        
        if (platform === 'youtube') {
            const videoId = extractYouTubeVideoId(url);
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }
            
            const metadata = await fetchYouTubeMetadata(videoId);
            videoData = {
                id: videoId,
                title: metadata.title,
                author: metadata.author_name,
                thumbnailUrl: metadata.thumbnail_url,
                platform: 'youtube',
                url: url
            };
        } else {
            // For other platforms, use Cobalt to get basic info
            const cobaltData = await fetchFromCobalt(url, { filenamePattern: 'basic' });
            videoData = {
                title: cobaltData.filename || 'Unknown Title',
                author: 'Unknown',
                thumbnailUrl: '',
                platform: platform,
                url: url
            };
        }
        
        appState.currentVideoData = videoData;
        displayVideoDetails(videoData);
        showSection(elements.videoDetailsSection);
        hideSection(elements.searchSection);
        hideSection(elements.searchResultsSection);
        hideSection(elements.publicLinkSection);
        hideSection(elements.downloadHistorySection);
        
        showNotification('Success', 'Video details loaded successfully');
    } catch (error) {
        console.error('Error fetching video details:', error);
        showNotification('Error', error.message || 'Failed to fetch video details', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

async function searchVideos(query) {
    showLoadingSpinner(true);
    
    try {
        const results = await searchYouTube(query);
        displaySearchResults(results);
        showSection(elements.searchResultsSection);
        hideSection(elements.searchSection);
        hideSection(elements.videoDetailsSection);
        hideSection(elements.publicLinkSection);
        hideSection(elements.downloadHistorySection);
        
        // Add to search history
        appState.searchHistory.unshift({
            query,
            timestamp: Date.now(),
            resultsCount: results.length
        });
        
        showNotification('Success', `Found ${results.length} results for "${query}"`);
    } catch (error) {
        console.error('Error searching videos:', error);
        showNotification('Error', error.message || 'Search failed', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

function displayVideoDetails(videoData) {
    elements.videoThumbnail.src = videoData.thumbnailUrl || 'https://picsum.photos/seed/video/800/450.jpg';
    elements.videoTitle.textContent = videoData.title;
    elements.videoChannel.textContent = videoData.author;
    elements.videoViews.textContent = 'N/A'; // Would need additional API call
    elements.videoDuration.textContent = 'N/A'; // Would need additional API call
    elements.videoUploadDate.textContent = 'N/A'; // Would need additional API call
    elements.videoDescription.textContent = 'Loading description...';
    
    // Generate format options
    generateFormatOptions(videoData.platform);
}

function generateFormatOptions(platform) {
    elements.formatOptions.innerHTML = '';
    
    const formatMap = {
        youtube: [
            { format: 'mp4', quality: '2160p', label: '4K Ultra HD', size: '245.8 MB' },
            { format: 'mp4', quality: '1080p', label: '1080p Full HD', size: '68.7 MB' },
            { format: 'mp4', quality: '720p', label: '720p HD', size: '35.4 MB' },
            { format: 'mp4', quality: '480p', label: '480p SD', size: '18.2 MB' },
            { format: 'mp4', quality: '360p', label: '360p', size: '9.8 MB' },
            { format: 'mp3', quality: '320', label: 'MP3 320kbps', size: '8.1 MB' },
            { format: 'mp3', quality: '128', label: 'MP3 128kbps', size: '3.2 MB' }
        ],
        instagram: [
            { format: 'mp4', quality: '1080p', label: '1080p HD', size: '25.4 MB' },
            { format: 'mp4', quality: '720p', label: '720p HD', size: '15.8 MB' },
            { format: 'mp4', quality: '480p', label: '480p SD', size: '8.2 MB' },
            { format: 'mp3', quality: '320', label: 'MP3 320kbps', size: '4.5 MB' }
        ],
        tiktok: [
            { format: 'mp4', quality: '1080p', label: '1080p HD (No Watermark)', size: '12.5 MB' },
            { format: 'mp4', quality: '720p', label: '720p HD (No Watermark)', size: '7.8 MB' },
            { format: 'mp3', quality: '320', label: 'MP3 320kbps', size: '2.8 MB' }
        ],
        default: [
            { format: 'mp4', quality: '720p', label: '720p HD', size: '20.5 MB' },
            { format: 'mp4', quality: '480p', label: '480p SD', size: '12.3 MB' },
            { format: 'mp3', quality: '320', label: 'MP3 320kbps', size: '5.2 MB' }
        ]
    };
    
    const formats = formatMap[platform] || formatMap.default;
    
    formats.forEach((format, index) => {
        const formatOption = document.createElement('div');
        formatOption.className = 'format-option';
        formatOption.onclick = () => selectFormat(formatOption, format);
        
        formatOption.innerHTML = `
            <div class="format-info">
                <span class="format-name">${format.label}</span>
                <span class="format-size">${format.size}</span>
            </div>
            <div class="format-radio">
                <input type="radio" name="video-format" value="${format.format}-${format.quality}" ${index === 0 ? 'checked' : ''}>
            </div>
        `;
        
        elements.formatOptions.appendChild(formatOption);
    });
}

function selectFormat(element, format) {
    // Remove selected class from all options
    document.querySelectorAll('.format-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    element.classList.add('selected');
    
    // Update selected format
    appState.selectedFormat = format.format;
    appState.selectedQuality = format.quality;
    
    // Enable download button
    const downloadBtn = document.getElementById('downloadVideoBtn');
    if (downloadBtn) {
        downloadBtn.disabled = false;
    }
}

function displaySearchResults(results) {
    elements.searchResultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        elements.searchResultsContainer.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-search"></i>
                <p>No results found</p>
            </div>
        `;
        return;
    }
    
    results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.onclick = () => selectSearchResult(result);
        
        const thumbnail = result.videoThumbnails?.find(t => t.quality === 'medium')?.url || 
                         result.videoThumbnails?.[0]?.url || 
                         'https://picsum.photos/seed/' + result.videoId + '/300/180.jpg';
        
        resultItem.innerHTML = `
            <div class="search-result-thumbnail">
                <img src="${thumbnail}" alt="${result.title}">
            </div>
            <div class="search-result-info">
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-meta">
                    <span><i class="fas fa-user"></i> ${result.author}</span>
                    <span><i class="fas fa-eye"></i> ${formatViewCount(result.viewCount || 0)}</span>
                    <span><i class="fas fa-clock"></i> ${formatDuration(result.lengthSeconds || 0)}</span>
                    <span><i class="fas fa-globe"></i> YouTube</span>
                </div>
            </div>
            <div class="search-result-actions">
                <button class="search-result-btn" onclick="event.stopPropagation(); downloadFromSearchResult('${result.videoId}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
        
        elements.searchResultsContainer.appendChild(resultItem);
    });
}

async function selectSearchResult(result) {
    appState.currentVideoData = {
        id: result.videoId,
        title: result.title,
        author: result.author,
        thumbnailUrl: result.videoThumbnails?.[0]?.url,
        platform: 'youtube',
        url: `https://www.youtube.com/watch?v=${result.videoId}`
    };
    
    displayVideoDetails(appState.currentVideoData);
    showSection(elements.videoDetailsSection);
    hideSection(elements.searchResultsSection);
}

async function downloadFromSearchResult(videoId) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    await fetchVideoDetails(url);
}

async function generatePublicLink() {
    if (!appState.currentVideoData.url) {
        showNotification('Error', 'No video selected', 'error');
        return;
    }
    
    showLoadingSpinner(true);
    
    try {
        const isAudio = appState.selectedFormat === 'mp3';
        const quality = appState.selectedQuality;
        
        const options = {
            vQuality: quality.replace('p', ''),
            aFormat: 'mp3',
            isAudioOnly: isAudio,
            filenamePattern: 'pretty'
        };
        
        const downloadData = await fetchFromCobalt(appState.currentVideoData.url, options);
        
        if (downloadData.status === 'picker') {
            // Handle multiple videos (playlists, carousels)
            handleVideoPicker(downloadData);
        } else {
            // Direct download
            const downloadInfo = {
                id: generateUniqueId(),
                url: appState.currentVideoData.url,
                title: appState.currentVideoData.title,
                platform: appState.currentVideoData.platform,
                format: isAudio ? 'mp3' : 'mp4',
                quality: quality,
                downloadUrl: downloadData.url,
                filename: downloadData.filename,
                timestamp: Date.now()
            };
            
            displayPublicLink(downloadInfo);
            saveToHistory(downloadInfo);
            updateDownloadCount();
            
            showNotification('Success', 'Download link generated successfully');
        }
    } catch (error) {
        console.error('Error generating download link:', error);
        showNotification('Error', error.message || 'Failed to generate download link', 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

function handleVideoPicker(pickerData) {
    // Show modal to select video from picker
    showPage('videoPicker');
    
    const container = document.getElementById('pageModalContent');
    container.innerHTML = `
        <div class="video-picker-container">
            <h3>Select Video to Download</h3>
            <div class="picker-videos">
                ${pickerData.picker.map((video, index) => `
                    <div class="picker-video" onclick="selectPickerVideo(${index})">
                        <img src="${video.thumb}" alt="Video ${index + 1}">
                        <span>Video ${index + 1}</span>
                    </div>
                `).join('')}
            </div>
            ${pickerData.audio ? `
                <div class="picker-audio">
                    <h4>Or download audio only:</h4>
                    <button class="btn-primary" onclick="downloadPickerAudio()">
                        <i class="fas fa-music"></i> Download Audio
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    // Store picker data globally
    window.currentPickerData = pickerData;
}

function selectPickerVideo(index) {
    const video = window.currentPickerData.picker[index];
    appState.currentVideoData.url = video.url;
    generatePublicLink();
    closePageModal();
}

function downloadPickerAudio() {
    appState.currentVideoData.url = window.currentPickerData.audio;
    appState.selectedFormat = 'mp3';
    generatePublicLink();
    closePageModal();
}

function displayPublicLink(downloadInfo) {
    const publicLink = `${window.location.origin}/download/${downloadInfo.id}`;
    
    elements.publicLinkInput.value = publicLink;
    elements.downloadTitle.textContent = downloadInfo.title;
    elements.downloadPlatform.textContent = downloadInfo.platform.charAt(0).toUpperCase() + downloadInfo.platform.slice(1);
    elements.downloadFormat.textContent = downloadInfo.format.toUpperCase();
    elements.downloadQuality.textContent = downloadInfo.quality;
    elements.downloadSize.textContent = estimateFileSize(180, downloadInfo.quality, downloadInfo.format);
    
    showSection(elements.publicLinkSection);
    hideSection(elements.videoDetailsSection);
    hideSection(elements.searchResultsSection);
    hideSection(elements.searchSection);
    hideSection(elements.downloadHistorySection);
}

function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showNotification('Download Started', 'Your download has started');
}

// --- HISTORY MANAGEMENT ---
function saveToHistory(downloadInfo) {
    if (!appState.userSettings.saveHistory) return;
    
    appState.downloadHistory.unshift(downloadInfo);
    
    // Keep only last 100 items
    if (appState.downloadHistory.length > 100) {
        appState.downloadHistory = appState.downloadHistory.slice(0, 100);
    }
    
    localStorage.setItem('allioDownloadHistory', JSON.stringify(appState.downloadHistory));
}

function loadHistory() {
    const saved = localStorage.getItem('allioDownloadHistory');
    if (saved) {
        appState.downloadHistory = JSON.parse(saved);
    }
}

function displayHistory() {
    elements.historyList.innerHTML = '';
    
    if (appState.downloadHistory.length === 0) {
        elements.historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-download"></i>
                <p>No download history yet</p>
            </div>
        `;
        return;
    }
    
    appState.downloadHistory.forEach((item, index) => {
        // Add ad banner every 5th item
        if (index > 0 && index % 5 === 0) {
            const adBanner = document.createElement('div');
            adBanner.className = 'history-ad-banner';
            adBanner.innerHTML = `
                <div class="ad-container ad-horizontal">
                    <div class="ad-label">Advertisement</div>
                    <div class="ad-content">
                        <script type="text/javascript">
                            atOptions = {
                                'key' : '478eb9342f285f826b942ea1f9e9db74',
                                'format' : 'iframe',
                                'height' : 90,
                                'width' : 728,
                                'params' : {}
                            };
                        </script>
                        <script type="text/javascript" src="//www.highperformanceformat.com/478eb9342f285f826b942ea1f9e9db74/invoke.js"></script>
                    </div>
                </div>
            `;
            elements.historyList.appendChild(adBanner);
        }
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const platformIcon = getPlatformIcon(item.platform);
        const date = new Date(item.timestamp).toLocaleDateString();
        
        historyItem.innerHTML = `
            <div class="history-thumbnail">
                <i class="fas fa-${platformIcon}"></i>
            </div>
            <div class="history-details">
                <div class="history-title">${item.title}</div>
                <div class="history-meta">
                    <span><i class="fas fa-globe"></i> ${item.platform}</span>
                    <span><i class="fas fa-file"></i> ${item.format}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="history-btn download" onclick="downloadFromHistory('${item.id}')">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="history-btn delete" onclick="removeFromHistory('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        elements.historyList.appendChild(historyItem);
    });
}

function getPlatformIcon(platform) {
    const icons = {
        youtube: 'youtube',
        instagram: 'instagram',
        tiktok: 'tiktok',
        facebook: 'facebook',
        twitter: 'twitter',
        telegram: 'telegram',
        reddit: 'reddit',
        pinterest: 'pinterest',
        vimeo: 'vimeo',
        dailymotion: 'play',
        soundcloud: 'soundcloud',
        twitch: 'twitch'
    };
    return icons[platform] || 'video';
}

function downloadFromHistory(id) {
    const item = appState.downloadHistory.find(item => item.id === id);
    if (item && item.downloadUrl) {
        triggerDownload(item.downloadUrl, item.filename);
        updateDownloadCount();
    }
}

function removeFromHistory(id) {
    appState.downloadHistory = appState.downloadHistory.filter(item => item.id !== id);
    localStorage.setItem('allioDownloadHistory', JSON.stringify(appState.downloadHistory));
    displayHistory();
    showNotification('Success', 'Item removed from history');
}

function clearDownloadHistory() {
    if (confirm('Are you sure you want to clear all download history?')) {
        appState.downloadHistory = [];
        localStorage.removeItem('allioDownloadHistory');
        displayHistory();
        showNotification('Success', 'Download history cleared');
    }
}

// --- UI EVENT HANDLERS ---
function toggleMenu() {
    elements.menu.classList.toggle('show');
}

function toggleLangDropdown() {
    elements.langDropdown.classList.toggle('show');
}

function changeLanguage(lang) {
    appState.userSettings.language = lang;
    localStorage.setItem('allioSettings', JSON.stringify(appState.userSettings));
    
    const langMap = {
        'en': 'EN',
        'hi': 'HI',
        'es': 'ES'
    };
    
    elements.currentLang.textContent = langMap[lang];
    elements.langDropdown.classList.remove('show');
    
    const langNames = {
        'en': 'English',
        'hi': 'हिन्दी',
        'es': 'Español'
    };
    
    showNotification('Language Changed', `Interface switched to ${langNames[lang]}`);
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        elements.inputUrl.value = text;
        showNotification('Pasted', 'URL pasted from clipboard');
        await processInput();
    } catch (err) {
        showNotification('Error', 'Could not access clipboard', 'error');
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    appState.userSettings.theme = newTheme;
    localStorage.setItem('allioSettings', JSON.stringify(appState.userSettings));
    
    showNotification('Theme Changed', `Switched to ${newTheme} mode`);
}

function openSettings() {
    showSection(elements.settingsModal);
    loadPlatformSettings();
}

function closeSettings() {
    hideSection(elements.settingsModal);
}

function loadPlatformSettings() {
    for (const [platform, settings] of Object.entries(appState.platformSettings)) {
        const formatSelect = document.getElementById(`${platform}-format`);
        const qualitySelect = document.getElementById(`${platform}-quality`);
        
        if (formatSelect) formatSelect.value = settings.format;
        if (qualitySelect) qualitySelect.value = settings.quality;
    }
}

function savePlatformSettings() {
    for (const platform of Object.keys(appState.platformSettings)) {
        const formatSelect = document.getElementById(`${platform}-format`);
        const qualitySelect = document.getElementById(`${platform}-quality`);
        
        if (formatSelect && qualitySelect) {
            appState.platformSettings[platform] = {
                format: formatSelect.value,
                quality: qualitySelect.value
            };
        }
    }
    
    localStorage.setItem('allioPlatformSettings', JSON.stringify(appState.platformSettings));
    showNotification('Settings Saved', 'Platform settings have been saved');
    closeSettings();
}

function resetDefaultSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
        localStorage.removeItem('allioSettings');
        localStorage.removeItem('allioPlatformSettings');
        
        appState.userSettings = {
            theme: 'dark',
            language: 'en',
            defaultQuality: '720p',
            defaultFormat: 'mp4',
            autoDownload: false,
            saveHistory: true
        };
        
        appState.platformSettings = {
            youtube: { format: 'mp4', quality: '1080p' },
            instagram: { format: 'mp4', quality: '720p' },
            tiktok: { format: 'mp4', quality: '720p' },
            facebook: { format: 'mp4', quality: '720p' },
            twitter: { format: 'mp4', quality: '720p' },
            telegram: { format: 'mp4', quality: '720p' },
            soundcloud: { format: 'mp3', quality: '320' },
            spotify: { format: 'mp3', quality: '320' }
        };
        
        showNotification('Settings Reset', 'All settings have been reset to defaults');
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
                    <p>Our mission is to provide the best possible media downloading experience with cutting-edge technology and user-friendly interface.</p>
                    
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
        document.getElementById('pageModalTitle').textContent = pageData.title;
        document.getElementById('pageModalContent').innerHTML = pageData.content;
        showSection(elements.pageModal);
    }
}

function closePageModal() {
    hideSection(elements.pageModal);
}

function shareApp() {
    const shareData = {
        title: 'ALLIO PRO - Premium Media Downloader',
        text: 'Check out this amazing media downloader!',
        url: window.location.origin
    };
    
    if (navigator.share) {
        navigator.share(shareData);
    } else {
        showPage('share');
        document.getElementById('pageModalTitle').textContent = 'Share ALLIO PRO';
        document.getElementById('pageModalContent').innerHTML = `
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
    }
}

function shareViaWhatsApp() {
    const text = "Check out ALLIO PRO - The ultimate media downloader! " + window.location.origin;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showNotification('Sharing', 'Opening WhatsApp...');
}

function shareViaTelegram() {
    const text = "Check out ALLIO PRO - The ultimate media downloader! " + window.location.origin;
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showNotification('Sharing', 'Opening Telegram...');
}

function copyShareLink() {
    const link = window.location.origin;
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Link Copied', 'Share link copied to clipboard!');
    });
}

function copyPublicLink() {
    elements.publicLinkInput.select();
    document.execCommand('copy');
    showNotification('Link Copied', 'Download link copied to clipboard!');
}

function generateNewLink() {
    if (appState.currentVideoData.url) {
        generatePublicLink();
    }
}

function downloadFromPublicLink() {
    const url = elements.publicLinkInput.value;
    if (url) {
        window.open(url, '_blank');
    }
}

function showDownloadHistory() {
    loadHistory();
    displayHistory();
    showSection(elements.downloadHistorySection);
    hideSection(elements.searchSection);
    hideSection(elements.videoDetailsSection);
    hideSection(elements.searchResultsSection);
    hideSection(elements.publicLinkSection);
}

function closeVideoDetails() {
    hideSection(elements.videoDetailsSection);
    showSection(elements.searchSection);
}

function closeSearchResults() {
    hideSection(elements.searchResultsSection);
    showSection(elements.searchSection);
}

function showBottomSheet() {
    showSection(elements.bottomSheet);
}

function closeBottomSheet() {
    hideSection(elements.bottomSheet);
}

// --- QR CODE FUNCTIONALITY ---
function generateQRCode(text) {
    // Simple QR code generation using a library would be ideal
    // For now, create a placeholder
    elements.qrCodeContainer.innerHTML = `
        <div style="padding: 20px; background: white; border-radius: 8px;">
            <p style="color: black; text-align: center;">QR Code for:<br>${text.substring(0, 50)}...</p>
        </div>
    `;
}

function showQrModal() {
    const link = elements.publicLinkInput.value;
    if (link) {
        generateQRCode(link);
        showSection(elements.qrModal);
    }
}

function closeQrModal() {
    hideSection(elements.qrModal);
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    const savedSettings = localStorage.getItem('allioSettings');
    if (savedSettings) {
        appState.userSettings = JSON.parse(savedSettings);
        
        // Apply theme
        if (appState.userSettings.theme) {
            document.documentElement.setAttribute('data-theme', appState.userSettings.theme);
        }
        
        // Apply language
        if (appState.userSettings.language) {
            elements.currentLang.textContent = appState.userSettings.language.toUpperCase();
        }
    }
    
    // Load platform settings
    const savedPlatformSettings = localStorage.getItem('allioPlatformSettings');
    if (savedPlatformSettings) {
        appState.platformSettings = JSON.parse(savedPlatformSettings);
    }
    
    // Load download history
    loadHistory();
    
    // Check for shared URL in query params
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');
    if (sharedUrl) {
        elements.inputUrl.value = sharedUrl;
        processInput();
    }
    
    // Add enter key support for search
    elements.inputUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processInput();
        }
    });
    
    // Add debounced search
    elements.inputUrl.addEventListener('input', debounce((e) => {
        const value = e.target.value.trim();
        if (value && !/^https?:\/\/.+/i.test(value)) {
            // This is a search query, could implement live search
        }
    }, 500));
    
    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-toggle') && !e.target.closest('.lang-dropdown')) {
            elements.langDropdown.classList.remove('show');
        }
        
        if (!e.target.closest('.menu-btn') && !e.target.closest('.dropdown-menu')) {
            elements.menu.classList.remove('show');
        }
        
        // Close modals on outside click
        if (e.target.classList.contains('popup-overlay')) {
            e.target.classList.remove('show');
        }
    });
    
    // Close bottom sheet on outside click
    document.addEventListener('click', (e) => {
        if (elements.bottomSheet.classList.contains('show') && 
            !e.target.closest('.bottom-sheet') && 
            !e.target.closest('.download-btn')) {
            closeBottomSheet();
        }
    });
    
    // Simulate live download count updates
    setInterval(() => {
        const count = parseInt(elements.downloadCount.textContent.replace(/[^0-9]/g, ''));
        const increment = Math.floor(Math.random() * 5) + 1;
        elements.downloadCount.textContent = `${(count + increment).toLocaleString()} Downloads Today`;
    }, 30000);
});

// --- EXPORT FUNCTIONS ---
window.downloadFromPublicLink = downloadFromPublicLink;
window.copyPublicLink = copyPublicLink;
window.generateNewLink = generateNewLink;
window.showDownloadHistory = showDownloadHistory;
window.clearDownloadHistory = clearDownloadHistory;
window.removeFromHistory = removeFromHistory;
window.downloadFromHistory = downloadFromHistory;
window.toggleTheme = toggleTheme;
window.changeLanguage = changeLanguage;
window.pasteFromClipboard = pasteFromClipboard;
window.processInput = processInput;
window.closeVideoDetails = closeVideoDetails;
window.closeSearchResults = closeSearchResults;
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
window.toggleMenu = toggleMenu;
window.toggleLangDropdown = toggleLangDropdown;
window.closeBottomSheet = closeBottomSheet;
window.selectFormat = selectFormat;
window.generatePublicLink = generatePublicLink;
window.selectSearchResult = selectSearchResult;
window.downloadFromSearchResult = downloadFromSearchResult;
window.selectPickerVideo = selectPickerVideo;
window.downloadPickerAudio = downloadPickerAudio;
window.showQrModal = showQrModal;
window.closeQrModal = closeQrModal;
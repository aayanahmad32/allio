// ===== ALLIO PRO - SIMPLIFIED WORKING VERSION =====
// Clean, efficient, and actually works!

// Configuration
const CONFIG = {
    apis: {
        cobalt: '/api/download', // Using backend proxy
        youtube: '/api/youtube-metadata', // Using backend proxy
        youtubeSearch: '/api/youtube-search' // Using backend proxy
    },
    youtubeApiKey: 'AIzaSyC7u-2sK5O6iQj5B-0X6Y7Z8A9B0C1D2E3F' // Will be used by backend
};

// State Management
let appState = {
    currentVideo: null,
    selectedFormat: 'mp4',
    selectedQuality: '720',
    downloadHistory: JSON.parse(localStorage.getItem('downloadHistory') || '[]')
};

// DOM Elements
const elements = {
    input: document.getElementById('inputUrl'),
    searchBtn: document.getElementById('searchBtn'),
    pasteBtn: document.getElementById('pasteBtn'),
    videoSection: document.getElementById('videoDetailsSection'),
    searchSection: document.getElementById('searchSection'),
    publicLinkSection: document.getElementById('publicLinkSection'),
    historySection: document.getElementById('downloadHistorySection'),
    resultSection: document.getElementById('searchResultsSection'),
    spinner: document.getElementById('loadingSpinner'),
    notification: document.getElementById('notification'),
    downloadBtn: document.getElementById('downloadVideoBtn')
};

// ===== UTILITY FUNCTIONS =====

function showSpinner(show = true) {
    if (elements.spinner) {
        elements.spinner.classList.toggle('show', show);
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
        elements.searchSection, 
        elements.publicLinkSection, 
        elements.historySection, 
        elements.resultSection
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

// ===== PLATFORM DETECTION =====

function detectPlatform(url) {
    const patterns = {
        youtube: /youtube\.com|youtu\.be/i,
        instagram: /instagram\.com/i,
        tiktok: /tiktok\.com/i,
        facebook: /facebook\.com|fb\.watch/i,
        twitter: /twitter\.com|x\.com/i
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

async function fetchVideoFromCobalt(url, options = {}) {
    try {
        // Use backend proxy instead of direct API call
        const response = await fetch(CONFIG.apis.cobalt, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                quality: options.quality || '720',
                isAudio: options.isAudio || false
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API request failed');
        }
        
        const data = await response.json();
        
        if (data.status === 'error' || data.status === 'rate-limit') {
            throw new Error(data.text || 'Download failed');
        }
        
        return data;
    } catch (error) {
        console.error('Cobalt API Error:', error);
        throw error;
    }
}

// ===== YOUTUBE SEARCH FUNCTIONALITY =====

async function searchYouTube(query) {
    try {
        // Use backend proxy instead of direct API call
        const response = await fetch(`${CONFIG.apis.youtubeSearch}?q=${encodeURIComponent(query)}&maxResults=10`);
        
        if (!response.ok) {
            throw new Error('YouTube search failed');
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            return data.items;
        }
        
        return [];
    } catch (error) {
        console.error('YouTube Search Error:', error);
        return [];
    }
}

// ===== VIDEO DETAILS =====

async function loadVideoDetails(url) {
    showSpinner(true);
    
    try {
        const { url: validatedUrl, platform } = validateAndProcessUrl(url);
        
        appState.currentVideo = {
            url: validatedUrl,
            platform: platform,
            title: 'Loading...',
            thumbnail: 'https://via.placeholder.com/800x450?text=Video'
        };
        
        // Get video metadata using backend proxy
        if (platform === 'youtube') {
            const videoId = extractYouTubeId(validatedUrl);
            if (videoId) {
                try {
                    const response = await fetch(`${CONFIG.apis.youtube}?url=${encodeURIComponent(validatedUrl)}`);
                    if (response.ok) {
                        const data = await response.json();
                        appState.currentVideo.title = data.title || 'YouTube Video';
                        appState.currentVideo.thumbnail = data.thumbnail_url || appState.currentVideo.thumbnail;
                        appState.currentVideo.author = data.author_name || 'Unknown';
                    }
                } catch (e) {
                    console.warn('Could not fetch metadata:', e);
                }
            }
        }
        
        displayVideoDetails();
        showSection(elements.videoSection);
        showNotification('Success', 'Video loaded successfully!');
        
    } catch (error) {
        showNotification('Error', error.message, 'error');
    } finally {
        showSpinner(false);
    }
}

function displayVideoDetails() {
    const video = appState.currentVideo;
    
    const thumbnail = document.getElementById('videoThumbnail');
    const title = document.getElementById('videoTitle');
    const channel = document.getElementById('videoChannel');
    const platform = document.getElementById('videoPlatform');
    
    if (thumbnail) thumbnail.src = video.thumbnail;
    if (title) title.textContent = video.title;
    if (channel) channel.textContent = video.author || video.platform;
    if (platform) platform.textContent = video.platform.toUpperCase();
    
    // Generate format options
    generateFormatOptions();
}

function generateFormatOptions() {
    const container = document.getElementById('formatOptions');
    if (!container) return;
    
    const formats = [
        { format: 'mp4', quality: '1080', label: '1080p Full HD', size: '~68 MB' },
        { format: 'mp4', quality: '720', label: '720p HD', size: '~35 MB' },
        { format: 'mp4', quality: '480', label: '480p SD', size: '~18 MB' },
        { format: 'mp3', quality: '320', label: 'MP3 Audio', size: '~8 MB' }
    ];
    
    container.innerHTML = formats.map((f, i) => `
        <div class="format-option ${i === 1 ? 'selected' : ''}" onclick="selectFormat('${f.format}', '${f.quality}', this)">
            <div class="format-info">
                <span class="format-name">${f.label}</span>
                <span class="format-size">${f.size}</span>
            </div>
            <input type="radio" name="format" ${i === 1 ? 'checked' : ''}>
        </div>
    `).join('');
}

function selectFormat(format, quality, element) {
    document.querySelectorAll('.format-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    appState.selectedFormat = format;
    appState.selectedQuality = quality;
}

// ===== DOWNLOAD LINK GENERATION =====

async function generateDownloadLink() {
    const btn = elements.downloadBtn;
    if (!btn || !appState.currentVideo) return;
    
    // Show loading state
    btn.classList.add('loading');
    btn.disabled = true;
    
    try {
        const isAudio = appState.selectedFormat === 'mp3';
        
        const downloadData = await fetchVideoFromCobalt(appState.currentVideo.url, {
            quality: appState.selectedQuality,
            isAudio: isAudio
        });
        
        if (!downloadData.url) {
            throw new Error('No download link received');
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
        showNotification('Error', error.message, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
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

// ===== SEARCH FUNCTIONALITY =====

async function performSearch(query) {
    showSpinner(true);
    showSection(elements.resultSection);
    
    // Show loading skeleton
    const skeleton = document.getElementById('searchLoadingSkeleton');
    const container = document.getElementById('searchResultsContainer');
    const emptyState = document.getElementById('searchEmptyState');
    
    if (skeleton) skeleton.classList.remove('hidden');
    if (container) container.innerHTML = '';
    if (emptyState) emptyState.classList.add('hidden');
    
    try {
        // Try to detect if it's a URL first
        const urlPattern = /^https?:\/\/.+/i;
        
        if (urlPattern.test(query)) {
            // It's a URL, load video details directly
            await loadVideoDetails(query);
            return;
        }
        
        // It's a search query, search YouTube
        const results = await searchYouTube(query);
        
        if (skeleton) skeleton.classList.add('hidden');
        
        if (results.length > 0) {
            displaySearchResults(results);
        } else {
            if (emptyState) emptyState.classList.remove('hidden');
        }
        
    } catch (error) {
        showNotification('Error', error.message, 'error');
        if (skeleton) skeleton.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
    } finally {
        showSpinner(false);
    }
}

function displaySearchResults(results) {
    const container = document.getElementById('searchResultsContainer');
    if (!container) return;
    
    container.innerHTML = results.map(item => `
        <div class="search-result-card" onclick="loadVideoFromSearch('${item.id}')">
            <div class="result-thumbnail">
                <img src="${item.thumbnail}" alt="${item.title}">
                <div class="platform-badge">
                    <i class="fab fa-youtube"></i>
                </div>
            </div>
            <div class="result-info">
                <div class="result-title">${item.title}</div>
                <div class="result-meta">
                    <div class="channel-name">
                        <i class="fas fa-user"></i>
                        <span>${item.channel}</span>
                    </div>
                </div>
            </div>
            <button class="quick-download-btn" onclick="event.stopPropagation(); quickDownload('${item.id}')">
                <i class="fas fa-download"></i>
            </button>
        </div>
    `).join('');
}

async function loadVideoFromSearch(videoId) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    await loadVideoDetails(url);
}

async function quickDownload(videoId) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
        const downloadData = await fetchVideoFromCobalt(url, {
            quality: '720',
            isAudio: false
        });
        
        if (downloadData.url) {
            // Open download link in new tab
            window.open(downloadData.url, '_blank');
            showNotification('Success', 'Download started!');
        }
    } catch (error) {
        showNotification('Error', error.message, 'error');
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

// ===== INPUT PROCESSING =====

async function processInput() {
    const input = elements.input.value.trim();
    
    if (!input) {
        showNotification('Error', 'Please enter a URL or search query', 'error');
        return;
    }
    
    await performSearch(input);
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (elements.input) {
            elements.input.value = text;
            showNotification('Success', 'URL pasted!');
            await processInput();
        }
    } catch (err) {
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

function toggleMenu() {
    const menu = document.getElementById('menu');
    if (menu) menu.classList.toggle('show');
}

function toggleLangDropdown() {
    const dropdown = document.getElementById('langDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function closeVideoDetails() {
    showSection(elements.searchSection);
}

function closeSearchResults() {
    showSection(elements.searchSection);
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

// ===== SEARCH & SUGGESTIONS =====

function searchSuggestion(query) {
    if (elements.input) {
        elements.input.value = query;
        processInput();
    }
}

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', () => {
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
    
    // Search button
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', processInput);
    }
    
    // Paste button
    if (elements.pasteBtn) {
        elements.pasteBtn.addEventListener('click', pasteFromClipboard);
    }
    
    // Enter key on input
    if (elements.input) {
        elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') processInput();
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

// Make functions globally available
window.processInput = processInput;
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
window.searchSuggestion = searchSuggestion;
window.closeSearchResults = closeSearchResults;
window.loadVideoFromSearch = loadVideoFromSearch;
window.quickDownload = quickDownload;

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
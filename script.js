// --- UI STATE VARIABLES ---
let currentMode = 'video';
let lyricsEnabled = true;
let privateMode = false;
let selectedFormat = 'classic-mp3';
let selectedQuality = 'high';
let isShortContent = false;
let browserHistory = [];
let browserHistoryIndex = -1;
let currentLanguage = 'en';
let currentPlatform = '';
let currentUrl = '';
let currentTitle = '';
let publicLinkId = '';
let downloadHistory = [];
let defaultSettings = {
    format: 'video',
    quality: 'high',
    lyrics: true
};
let platformSettings = {
    youtube: { format: 'video', quality: 'high' },
    instagram: { format: 'video', quality: 'high' },
    tiktok: { format: 'video', quality: 'high' },
    streamnet: { format: 'video', quality: 'high' },
    diskwala: { format: 'video', quality: 'high' },
    sora: { format: 'sora', quality: 'high' }
};

// --- DOM ELEMENTS ---
const input = document.getElementById('inputUrl');
const bottomSheet = document.getElementById('bottomSheet');
const downloadBtn = document.getElementById('downloadBtn');
const searchSection = document.querySelector('.hero-container');
const menu = document.getElementById('menu');
const browserUrl = document.getElementById('browserUrl');
const browserPlaceholder = document.getElementById('browserPlaceholder');
const langDropdown = document.getElementById('langDropdown');
const currentLang = document.getElementById('currentLang');
const downloadCount = document.getElementById('downloadCount');
const settingsModal = document.getElementById('settingsModal');
const pageModal = document.getElementById('pageModal');
const pageModalTitle = document.getElementById('pageModalTitle');
const pageModalContent = document.getElementById('pageModalContent');
const notification = document.getElementById('notification');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const publicLinkSection = document.getElementById('publicLinkSection');
const publicLinkInput = document.getElementById('publicLinkInput');
const downloadHistorySection = document.getElementById('downloadHistorySection');
const historyList = document.getElementById('historyList');

// --- FUNCTIONS ---

function toggleMenu() {
    menu.classList.toggle('show');
}

// Language functions
function toggleLangDropdown() {
    langDropdown.classList.toggle('show');
}

function changeLanguage(lang) {
    currentLanguage = lang;
    const langMap = {
        'en': 'EN',
        'hi': 'HI',
        'es': 'ES'
    };
    currentLang.innerText = langMap[lang];
    langDropdown.classList.remove('show');
    
    // Show notification
    const langNames = {
        'en': 'English',
        'hi': 'हिन्दी',
        'es': 'Español'
    };
    showNotification('Language Changed', `Interface switched to ${langNames[lang]}`);
}

// Paste from clipboard
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        input.value = text;
        showNotification('Pasted', 'URL pasted from clipboard');
    } catch (err) {
        showNotification('Error', 'Could not access clipboard');
    }
}

// Enhanced Search Function
async function processInput() {
    const val = input.value.trim();
    if(!val) return;

    // Check if it's a URL or search term
    const isUrl = /^https?:\/\/.+/i.test(val);
    
    if (!isUrl) {
        // Search for song/video
        await searchMedia(val);
        return;
    }

    // Check if it's a short content (reels, shorts, etc.)
    isShortContent = checkIfShortContent(val);
    
    // Check if it's a Sora 2 AI content
    const isSoraContent = checkIfSoraContent(val);
    
    // Check platform type
    currentPlatform = detectPlatform(val);
    currentUrl = val;
    
    if (isShortContent) {
        // Direct download for short content
        handleShortContentDownload(val);
        return;
    }
    
    // Load default settings if available
    loadDefaultSettings();
    
    // Show bottom sheet for long content
    showBottomSheet();
}

// Search Media Function
async function searchMedia(query) {
    showNotification('Searching', `Finding: ${query}`);
    
    // Simulate search
    setTimeout(() => {
        // Mock results
        const mockResults = [
            { title: `${query} - Official Video`, platform: 'YouTube' },
            { title: `${query} - Audio Version`, platform: 'Spotify' },
            { title: `${query} - TikTok Remix`, platform: 'TikTok' }
        ];
        
        // Show search results (you can implement a modal for this)
        showNotification('Search Complete', `Found ${mockResults.length} results`);
        
        // Auto-select first result and proceed
        input.value = 'https://youtube.com/watch?v=example';
        processInput();
    }, 1500);
}

// Check if URL is for short content
function checkIfShortContent(url) {
    const shortContentPatterns = [
        /youtube\.com\/shorts/,
        /instagram\.com\/reel/,
        /tiktok\.com\/@.*\/video/,
        /facebook\.com\/reel/,
        /twitter\.com\/.*\/status/
    ];
    
    return shortContentPatterns.some(pattern => pattern.test(url));
}

// Check if URL is for Sora 2 AI content
function checkIfSoraContent(url) {
    const soraPatterns = [
        /openai\.com\/sora/,
        /sora\.ai/,
        /chatgpt\.com\/.*\/share/,
        /sora2/
    ];
    
    return soraPatterns.some(pattern => pattern.test(url));
}

// Detect platform from URL
function detectPlatform(url) {
    const platformPatterns = {
        youtube: /youtube\.com|youtu\.be/,
        instagram: /instagram\.com/,
        tiktok: /tiktok\.com/,
        facebook: /facebook\.com|fb\.watch/,
        twitter: /twitter\.com|x\.com/,
        telegram: /t\.me|telegram\.me/,
        terabox: /terabox\.com|1024tera\.com/,
        streamnet: /streamnet\./,
        diskwala: /diskwala\./,
        sora: /openai\.com\/sora|sora\.ai|sora2/
    };
    
    for (const [platform, pattern] of Object.entries(platformPatterns)) {
        if (pattern.test(url)) {
            return platform;
        }
    }
    
    return 'unknown';
}

// Show bottom sheet modal
function showBottomSheet() {
    bottomSheet.classList.add('show');
    
    // Update download count
    const count = parseInt(downloadCount.innerText.replace(/[^0-9]/g, '')) + 1;
    downloadCount.innerText = `${count.toLocaleString()} Downloads Today`;
    
    // Enable download button by default since Classic MP3 is pre-selected
    downloadBtn.disabled = false;
}

// Close bottom sheet modal
function closeBottomSheet() {
    bottomSheet.classList.remove('show');
}

// Handle format selection
document.querySelectorAll('input[name="format"]').forEach(radio => {
    radio.addEventListener('change', function() {
        selectedFormat = this.value;
        downloadBtn.disabled = false;
    });
});

// Handle short content download
function handleShortContentDownload(url) {
    // Update download count
    const count = parseInt(downloadCount.innerText.replace(/[^0-9]/g, '')) + 1;
    downloadCount.innerText = `${count.toLocaleString()} Downloads Today`;
    
    // Generate title
    currentTitle = `Short Content - ${currentPlatform}`;
    
    // Generate public link
    generatePublicLinkForShortContent(url);
    
    // Show notification
    showNotification('Download Ready', 'Short content link generated successfully!');
}

// Generate public link for short content
function generatePublicLinkForShortContent(url) {
    // Create a unique ID for this download
    publicLinkId = generateUniqueId();
    
    // Create download data
    const downloadData = {
        id: publicLinkId,
        url: url,
        title: currentTitle,
        platform: currentPlatform,
        format: 'video',
        quality: 'high',
        isShortContent: true,
        timestamp: new Date().toISOString()
    };
    
    // Store in localStorage (simulate backend)
    localStorage.setItem(`download_${publicLinkId}`, JSON.stringify(downloadData));
    
    // Show public link section
    showPublicLinkSection(downloadData);
    
    // Add to history
    addToDownloadHistory(downloadData);
}

// Generate public link
function generatePublicLink() {
    if (!selectedFormat) {
        showNotification('Error', 'Please select a format');
        return;
    }
    
    // Close bottom sheet
    closeBottomSheet();
    
    // Create a unique ID for this download
    publicLinkId = generateUniqueId();
    
    // Generate title based on platform
    currentTitle = `${currentPlatform.charAt(0).toUpperCase() + currentPlatform.slice(1)} Video`;
    
    // Create download data
    const downloadData = {
        id: publicLinkId,
        url: currentUrl,
        title: currentTitle,
        platform: currentPlatform,
        format: selectedFormat,
        quality: selectedQuality,
        isShortContent: false,
        timestamp: new Date().toISOString()
    };
    
    // Store in localStorage (simulate backend)
    localStorage.setItem(`download_${publicLinkId}`, JSON.stringify(downloadData));
    
    // Show public link section
    showPublicLinkSection(downloadData);
    
    // Add to history
    addToDownloadHistory(downloadData);
    
    // Show notification
    showNotification('Link Generated', 'Your download link is ready!');
}

// Generate unique ID
function generateUniqueId() {
    return 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Show public link section
function showPublicLinkSection(downloadData) {
    // Hide other sections
    searchSection.style.display = 'none';
    document.querySelector('.seo-content').style.display = 'none';
    document.querySelector('.ad-banner').style.display = 'none';
    downloadHistorySection.classList.add('hidden');
    
    // Show public link section
    publicLinkSection.classList.remove('hidden');
    
    // Update public link input
    const publicLink = `${window.location.origin}/download/${downloadData.id}`;
    publicLinkInput.value = publicLink;
    
    // Update download info
    document.getElementById('downloadTitle').textContent = downloadData.title;
    document.getElementById('downloadPlatform').textContent = downloadData.platform.charAt(0).toUpperCase() + downloadData.platform.slice(1);
    document.getElementById('downloadFormat').textContent = downloadData.format.charAt(0).toUpperCase() + downloadData.format.slice(1);
    document.getElementById('downloadQuality').textContent = downloadData.quality.charAt(0).toUpperCase() + downloadData.quality.slice(1);
}

// Copy public link
function copyPublicLink() {
    publicLinkInput.select();
    document.execCommand('copy');
    showNotification('Link Copied', 'Download link copied to clipboard!');
}

// Generate new link
function generateNewLink() {
    // Generate new ID
    publicLinkId = generateUniqueId();
    
    // Get existing download data
    const existingData = JSON.parse(localStorage.getItem(`download_${publicLinkId}`) || '{}');
    
    // Update with new ID
    existingData.id = publicLinkId;
    existingData.timestamp = new Date().toISOString();
    
    // Store new data
    localStorage.setItem(`download_${publicLinkId}`, JSON.stringify(existingData));
    
    // Update public link
    const publicLink = `${window.location.origin}/download/${publicLinkId}`;
    publicLinkInput.value = publicLink;
    
    showNotification('New Link Generated', 'A new download link has been created!');
}

// Download from public link
function downloadFromPublicLink() {
    // Get download data
    const downloadData = JSON.parse(localStorage.getItem(`download_${publicLinkId}`));
    
    if (!downloadData) {
        showNotification('Error', 'Download link expired or invalid');
        return;
    }
    
    // Simulate download
    simulateDownload(downloadData.format, downloadData.title);
    
    // Update history with download status
    updateDownloadHistoryStatus(publicLinkId, 'completed');
}

// Simulate download process
function simulateDownload(format, title) {
    let formatName = format;
    
    if (format === 'classic-mp3') formatName = 'Classic MP3';
    else if (format === 'fast-mp3') formatName = 'Fast MP3';
    else if (format === 'fast-360p') formatName = 'Fast (360p)';
    else if (format === 'high-720p') formatName = 'High quality (720p)';
    else if (format === '1080p-hd') formatName = '1080p HD';
    else if (format === 'direct-short') formatName = 'Short Content';
    
    // Show notification
    showNotification('Download Started', `Downloading ${formatName}...`);
    
    // Simulate download progress
    setTimeout(() => {
        showNotification('Download Complete', `${title} downloaded successfully!`);
    }, 2000);
}

// Add to download history
function addToDownloadHistory(downloadData) {
    // Load existing history
    const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
    
    // Add new item
    history.unshift({
        ...downloadData,
        status: 'pending',
        downloadDate: new Date().toLocaleDateString()
    });
    
    // Keep only last 50 items
    if (history.length > 50) {
        history.pop();
    }
    
    // Save to localStorage
    localStorage.setItem('downloadHistory', JSON.stringify(history));
    
    // Update global variable
    downloadHistory = history;
}

// Update download history status
function updateDownloadHistoryStatus(id, status) {
    const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
    
    const item = history.find(item => item.id === id);
    if (item) {
        item.status = status;
        localStorage.setItem('downloadHistory', JSON.stringify(history));
        downloadHistory = history;
    }
}

// Show download history
function showDownloadHistory() {
    // Hide other sections
    searchSection.style.display = 'none';
    document.querySelector('.seo-content').style.display = 'none';
    document.querySelector('.ad-banner').style.display = 'none';
    publicLinkSection.classList.add('hidden');
    
    // Show download history section
    downloadHistorySection.classList.remove('hidden');
    
    // Load and display history
    loadDownloadHistory();
}

// Load download history
function loadDownloadHistory() {
    // Load from localStorage
    downloadHistory = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
    
    // Clear existing list
    historyList.innerHTML = '';
    
    if (downloadHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-download"></i>
                <p>No download history yet</p>
            </div>
        `;
        return;
    }
    
    // Display each item
    downloadHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-thumbnail">
                <i class="fas fa-${getPlatformIcon(item.platform)}"></i>
            </div>
            <div class="history-details">
                <div class="history-title">${item.title}</div>
                <div class="history-meta">
                    <span><i class="fas fa-globe"></i> ${item.platform}</span>
                    <span><i class="fas fa-file"></i> ${item.format}</span>
                    <span><i class="fas fa-calendar"></i> ${item.downloadDate}</span>
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
        historyList.appendChild(historyItem);
    });
}

// Get platform icon
function getPlatformIcon(platform) {
    const icons = {
        youtube: 'youtube',
        instagram: 'instagram',
        tiktok: 'tiktok',
        facebook: 'facebook',
        twitter: 'twitter',
        telegram: 'telegram',
        terabox: 'cloud',
        streamnet: 'network-wired',
        diskwala: 'hdd',
        sora: 'brain'
    };
    return icons[platform] || 'video';
}

// Download from history
function downloadFromHistory(id) {
    const item = downloadHistory.find(item => item.id === id);
    if (item) {
        // Set current data
        publicLinkId = id;
        currentUrl = item.url;
        currentTitle = item.title;
        currentPlatform = item.platform;
        
        // Show public link section
        showPublicLinkSection(item);
        
        // Start download
        downloadFromPublicLink();
    }
}

// Remove from history
function removeFromHistory(id) {
    // Filter out the item
    downloadHistory = downloadHistory.filter(item => item.id !== id);
    
    // Save to localStorage
    localStorage.setItem('downloadHistory', JSON.stringify(downloadHistory));
    
    // Reload history display
    loadDownloadHistory();
    
    showNotification('Removed', 'Item removed from history');
}

// Clear download history
function clearDownloadHistory() {
    if (confirm('Are you sure you want to clear all download history?')) {
        downloadHistory = [];
        localStorage.removeItem('downloadHistory');
        loadDownloadHistory();
        showNotification('Cleared', 'Download history cleared');
    }
}

// Save default settings to localStorage
function saveDefaultSettings() {
    localStorage.setItem('allioProDefaultSettings', JSON.stringify(defaultSettings));
}

// Load default settings from localStorage
function loadDefaultSettings() {
    const saved = localStorage.getItem('allioProDefaultSettings');
    if (saved) {
        defaultSettings = JSON.parse(saved);
        selectedFormat = defaultSettings.format;
        selectedQuality = defaultSettings.quality;
        lyricsEnabled = defaultSettings.lyrics;
    }
    
    // Load platform settings
    const savedPlatformSettings = localStorage.getItem('allioProPlatformSettings');
    if (savedPlatformSettings) {
        platformSettings = JSON.parse(savedPlatformSettings);
    }
}

// Save platform settings to localStorage
function savePlatformSettings() {
    localStorage.setItem('allioProPlatformSettings', JSON.stringify(platformSettings));
}

// Reset default settings
function resetDefaultSettings() {
    localStorage.removeItem('allioProDefaultSettings');
    localStorage.removeItem('allioProPlatformSettings');
    defaultSettings = {
        format: 'video',
        quality: 'high',
        lyrics: true
    };
    platformSettings = {
        youtube: { format: 'video', quality: 'high' },
        instagram: { format: 'video', quality: 'high' },
        tiktok: { format: 'video', quality: 'high' },
        streamnet: { format: 'video', quality: 'high' },
        diskwala: { format: 'video', quality: 'high' },
        sora: { format: 'sora', quality: 'high' }
    };
    showNotification('Settings Reset', 'Default settings have been reset to factory defaults');
}

// Toggle Theme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    
    // Show notification
    showNotification('Theme Changed', `Switched to ${newTheme} mode`);
}

// Toggle Private Mode
function togglePrivateMode() {
    privateMode = !privateMode;
    showNotification('Private Mode', privateMode ? 'Enabled - Your downloads are now private' : 'Disabled');
}

// Show Notification
function showNotification(title, message) {
    notificationTitle.innerText = title;
    notificationMessage.innerText = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Open Settings Modal
function openSettings() {
    settingsModal.classList.add('show');
    
    // Load current platform settings
    for (const [platform, settings] of Object.entries(platformSettings)) {
        const formatSelect = document.getElementById(`${platform}-format`);
        const qualitySelect = document.getElementById(`${platform}-quality`);
        
        if (formatSelect) formatSelect.value = settings.format;
        if (qualitySelect) qualitySelect.value = settings.quality;
    }
}

// Close Settings Modal
function closeSettings() {
    settingsModal.classList.remove('show');
}

// Save Platform Settings
function savePlatformSettings() {
    // Save all platform settings
    for (const platform of Object.keys(platformSettings)) {
        const formatSelect = document.getElementById(`${platform}-format`);
        const qualitySelect = document.getElementById(`${platform}-quality`);
        
        if (formatSelect && qualitySelect) {
            platformSettings[platform] = {
                format: formatSelect.value,
                quality: qualitySelect.value
            };
        }
    }
    
    // Save to localStorage
    localStorage.setItem('allioProPlatformSettings', JSON.stringify(platformSettings));
    
    // Show notification
    showNotification('Settings Saved', 'Platform settings have been saved');
    
    // Close modal
    closeSettings();
}

// Show Page Modal
function showPage(page) {
    const pages = {
        about: {
            title: 'About Us',
            content: `
                <div class="page-content">
                    <h3>About ALLIO PRO</h3>
                    <p>ALLIO PRO is a premium global media downloader developed by LoopLabs Tech. We provide high-quality video and audio downloads from all major social media platforms, including Sora 2 AI content.</p>
                    
                    <h3>Our Mission</h3>
                    <p>Our mission is to provide the best possible media downloading experience with cutting-edge technology and user-friendly interface. We believe everyone should have easy access to their favorite content across all platforms.</p>
                    
                    <h3>Why Choose ALLIO PRO?</h3>
                    <ul>
                        <li>Support for 20+ platforms including Sora 2 AI</li>
                        <li>8K video downloads</li>
                        <li>Embedded lyrics in audio files</li>
                        <li>Lightning-fast download speeds</li>
                        <li>Completely free to use</li>
                        <li>No registration required</li>
                    </ul>
                    
                    <h3>Our Team</h3>
                    <p>LoopLabs Tech is a team of passionate developers and designers dedicated to creating innovative solutions for media consumption. With years of experience in web technologies, we've built ALLIO PRO to be the most comprehensive media downloader available.</p>
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
                    
                    <h3>Follow Us</h3>
                    <div class="social-links">
                        <a href="https://instagram.com/looplabstech" target="_blank" class="social-link">
                            <i class="fab fa-instagram"></i>
                        </a>
                        <a href="#" class="social-link">
                            <i class="fab fa-twitter"></i>
                        </a>
                        <a href="#" class="social-link">
                            <i class="fab fa-facebook"></i>
                        </a>
                        <a href="#" class="social-link">
                            <i class="fab fa-telegram"></i>
                        </a>
                    </div>
                    
                    <h3>Send us a Message</h3>
                    <p>For the fastest response, please contact us through our Instagram page or send an email to support@looplabstech.com. We typically respond within 24 hours.</p>
                </div>
            `
        },
        privacy: {
            title: 'Privacy Policy',
            content: `
                <div class="page-content">
                    <h3>Privacy Policy</h3>
                    <p>At ALLIO PRO, we take your privacy seriously. This policy outlines how we collect, use, and protect your information when you use our service.</p>
                    
                    <h3>Information We Collect</h3>
                    <ul>
                        <li>URLs you submit for downloading</li>
                        <li>Device information (browser type, IP address)</li>
                        <li>Usage data and analytics</li>
                    </ul>
                    
                    <h3>How We Use Your Information</h3>
                    <ul>
                        <li>To provide and improve our service</li>
                        <li>To analyze usage patterns</li>
                        <li>To communicate with you about service updates</li>
                    </ul>
                    
                    <h3>Data Protection</h3>
                    <p>We implement appropriate security measures to protect your information. However, no method of transmission over the internet is 100% secure.</p>
                    
                    <h3>Third-Party Services</h3>
                    <p>Our service may contain links to third-party websites. We are not responsible for the privacy practices of these sites.</p>
                    
                    <h3>Changes to This Policy</h3>
                    <p>We may update this policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
                    
                    <h3>Contact Us</h3>
                    <p>If you have any questions about this Privacy Policy, please contact us at support@looplabstech.com</p>
                </div>
            `
        },
        faq: {
            title: 'Frequently Asked Questions',
            content: `
                <div class="page-content">
                    <h3>General Questions</h3>
                    
                    <h4>What is ALLIO PRO?</h4>
                    <p>ALLIO PRO is a free online tool that allows you to download videos and music from various social media platforms including YouTube, Instagram, TikTok, Facebook, Twitter, Telegram, Terabox, StreamNet, DiskWala, and Sora 2 AI.</p>
                    
                    <h4>Is ALLIO PRO free to use?</h4>
                    <p>Yes, ALLIO PRO is completely free to use with no hidden charges or subscription fees.</p>
                    
                    <h4>Do I need to register to use ALLIO PRO?</h4>
                    <p>No registration is required. You can start downloading immediately without creating an account.</p>
                    
                    <h3>Download Questions</h3>
                    
                    <h4>What formats can I download?</h4>
                    <p>You can download videos in MP4, WebM, and other formats. Audio can be downloaded as MP3, M4A, or FLAC. We support quality options up to 8K for videos and 320kbps for audio.</p>
                    
                    <h4>Can I download entire playlists?</h4>
                    <p>Yes, ALLIO PRO supports downloading entire playlists from YouTube and other platforms that offer playlists.</p>
                    
                    <h4>What is the Sora 2 AI feature?</h4>
                    <p>Our Sora 2 AI feature allows you to download AI-generated videos from OpenAI's Sora platform. You can also extract the text prompts used to generate these videos.</p>
                    
                    <h3>Technical Questions</h3>
                    
                    <h4>Is there a download limit?</h4>
                    <p>There is no strict download limit, but we may implement fair usage policies to ensure service quality for all users.</p>
                    
                    <h4>Why is my download slow?</h4>
                    <p>Download speed depends on your internet connection and the source platform's server load. Try downloading during off-peak hours for better speeds.</p>
                    
                    <h4>Can I use ALLIO PRO on mobile?</h4>
                    <p>Yes, ALLIO PRO is fully responsive and works on all devices including smartphones and tablets.</p>
                </div>
            `
        },
        blog: {
            title: 'Blog',
            content: `
                <div class="page-content">
                    <h3>Latest Updates</h3>
                    
                    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h4>Introducing Sora 2 AI Support</h4>
                        <p style="color: var(--text-muted); margin-bottom: 10px;">Posted on October 15, 2023</p>
                        <p>We're excited to announce support for downloading and analyzing OpenAI's Sora 2 AI videos. Extract prompts and upscale AI-generated content to 4K resolution.</p>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h4>New Platform: StreamNet Integration</h4>
                        <p style="color: var(--text-muted); margin-bottom: 10px;">Posted on September 28, 2023</p>
                        <p>ALLIO PRO now supports downloading videos from StreamNet platform. Enjoy high-quality downloads with our new dedicated downloader.</p>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h4>8K Video Downloads Now Available</h4>
                        <p style="color: var(--text-muted); margin-bottom: 10px;">Posted on September 10, 2023</p>
                        <p>Experience videos in stunning 8K resolution. We've added support for downloading 8K videos from YouTube and other supported platforms.</p>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h4>Embedded Lyrics Feature Launch</h4>
                        <p style="color: var(--text-muted); margin-bottom: 10px;">Posted on August 22, 2023</p>
                        <p>Now you can download MP3 files with embedded lyrics and cover art. Sing along to your favorite songs with synchronized lyrics.</p>
                    </div>
                </div>
            `
        },
        docs: {
            title: 'Documentation',
            content: `
                <div class="page-content">
                    <h3>Getting Started</h3>
                    <p>Welcome to ALLIO PRO documentation. Here you'll find everything you need to know about using our service.</p>
                    
                    <h3>Basic Usage</h3>
                    <ol>
                        <li>Copy the URL of the video or music you want to download</li>
                        <li>Paste it into the search box on our homepage</li>
                        <li>Select your preferred format and quality</li>
                        <li>Click the download button</li>
                    </ol>
                    
                    <h3>Supported Platforms</h3>
                    <ul>
                        <li><strong>YouTube:</strong> Videos, music, playlists</li>
                        <li><strong>Instagram:</strong> Posts, reels, stories, IGTV</li>
                        <li><strong>TikTok:</strong> Videos without watermark</li>
                        <li><strong>Facebook:</strong> Videos, reels</li>
                        <li><strong>Twitter:</strong> Videos, GIFs</li>
                        <li><strong>Telegram:</strong> Files from channels and chats</li>
                        <li><strong>Terabox:</strong> Cloud storage files</li>
                        <li><strong>StreamNet:</strong> Platform videos</li>
                        <li><strong>DiskWala:</strong> Cloud storage files</li>
                        <li><strong>Sora 2 AI:</strong> AI-generated videos with prompt extraction</li>
                    </ul>
                    
                    <h3>Advanced Features</h3>
                    <h4>Platform Settings</h4>
                    <p>Set default download formats and qualities for each platform. Go to Settings > Platform Settings to configure your preferences.</p>
                    
                    <h4>Audio with Lyrics</h4>
                    <p>When downloading audio files, you can choose to include embedded lyrics and cover art. This feature works for most popular songs.</p>
                    
                    <h4>Browser Mode</h4>
                    <p>Use our built-in browser to navigate websites and download media directly from any page. This is useful for sites not directly supported.</p>
                    
                    <h3>Troubleshooting</h3>
                    <h4>Download Failed</h4>
                    <p>If a download fails, try the following:</p>
                    <ul>
                        <li>Check if the URL is correct</li>
                        <li>Try a different quality option</li>
                        <li>Clear your browser cache and cookies</li>
                        <li>Try again later as the source may be temporarily unavailable</li>
                    </ul>
                    
                    <h4>Video Not Playing</h4>
                    <p>If your downloaded video doesn't play, try using a different media player like VLC or MPC-HC. Some formats may require specific codecs.</p>
                </div>
            `
        }
    };
    
    const pageData = pages[page];
    if (pageData) {
        pageModalTitle.innerText = pageData.title;
        pageModalContent.innerHTML = pageData.content;
        pageModal.classList.add('show');
    }
}

// Close Page Modal
function closePageModal() {
    pageModal.classList.remove('show');
}

// Share App
function shareApp() {
    pageModalTitle.innerText = 'Share ALLIO PRO';
    pageModalContent.innerHTML = `
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
            
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-top: 20px;">
                <p style="font-family: monospace; word-break: break-all;">https://allio-delta.vercel.app/?ref=share</p>
            </div>
        </div>
    `;
    pageModal.classList.add('show');
}

// Share via WhatsApp
function shareViaWhatsApp() {
    const text = "Check out ALLIO PRO - The ultimate media downloader for all platforms! https://allio-delta.vercel.app/?ref=share";
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showNotification('Sharing', 'Opening WhatsApp...');
}

// Share via Telegram
function shareViaTelegram() {
    const text = "Check out ALLIO PRO - The ultimate media downloader for all platforms! https://allio-delta.vercel.app/?ref=share";
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://allio-delta.vercel.app/?ref=share')}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showNotification('Sharing', 'Opening Telegram...');
}

// Copy share link
function copyShareLink() {
    const link = "https://allio-delta.vercel.app/?ref=share";
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Link Copied', 'Share link copied to clipboard!');
    });
}

// Enter Key Support
input.addEventListener('keypress', (e) => { 
    if(e.key === 'Enter') processInput(); 
});

// Close menu on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-btn') && !e.target.closest('.dropdown-menu') && !e.target.closest('.instagram-btn')) {
        menu.classList.remove('show');
    }
    
    if (!e.target.closest('.lang-toggle') && !e.target.closest('.lang-dropdown')) {
        langDropdown.classList.remove('show');
    }
    
    // Close bottom sheet when clicking outside
    if (bottomSheet.classList.contains('show') && !e.target.closest('.bottom-sheet')) {
        closeBottomSheet();
    }
});

// Simulate live download count updates
setInterval(() => {
    const count = parseInt(downloadCount.innerText.replace(/[^0-9]/g, ''));
    const increment = Math.floor(Math.random() * 5) + 1;
    downloadCount.innerText = `${(count + increment).toLocaleString()} Downloads Today`;
}, 30000);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    loadDefaultSettings();
    
    // Load download history
    downloadHistory = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
    
    // Check for shared URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');
    
    if (sharedUrl) {
        input.value = sharedUrl;
        processInput();
    }
    
    // Check for download ID in URL
    const downloadId = window.location.pathname.split('/download/')[1];
    if (downloadId) {
        const downloadData = JSON.parse(localStorage.getItem(`download_${downloadId}`));
        if (downloadData) {
            publicLinkId = downloadId;
            showPublicLinkSection(downloadData);
        }
    }
});

// Logo and favicon prompts
console.log("=== LOGO PROMPT ===");
console.log("Create a modern, sleek logo for 'ALLIO PRO', a global media downloader. The logo should feature a lightning bolt icon integrated with a download arrow. Use a gradient of purple and blue colors. The design should be minimalist and suitable for both dark and light backgrounds. The logo should be in vector format and scalable.");

console.log("=== FAVICON PROMPT ===");
console.log("Design a 16x16 and 32x32 pixel favicon for 'ALLIO PRO'. The favicon should be a simplified version of the logo, featuring a lightning bolt. Use the same purple and blue gradient. The design must be clear and recognizable even at small sizes.");
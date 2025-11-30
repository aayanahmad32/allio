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

// App Launcher Data with proper icons
const appLauncherApps = [
    { name: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000', url: 'https://youtube.com' },
    { name: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C', url: 'https://instagram.com' },
    { name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000', url: 'https://tiktok.com' },
    { name: 'Facebook', icon: 'fab fa-facebook', color: '#1877F2', url: 'https://facebook.com' },
    { name: 'Twitter', icon: 'fab fa-twitter', color: '#1DA1F2', url: 'https://twitter.com' },
    { name: 'Telegram', icon: 'fab fa-telegram', color: '#0088CC', url: 'https://telegram.org' },
    { name: 'Terabox', icon: 'fas fa-cloud', color: '#00D4AA', url: 'https://terabox.com' },
    { name: 'StreamNet', icon: 'fas fa-network-wired', color: '#6A5ACD', url: 'https://streamnet.com' },
    { name: 'DiskWala', icon: 'fas fa-hdd', color: '#FF8C00', url: 'https://diskwala.com' },
    { name: 'Sora 2 AI', icon: 'fas fa-brain', color: '#FF00FF', url: 'https://openai.com/sora' },
    { name: 'SoundCloud', icon: 'fab fa-soundcloud', color: '#FF3300', url: 'https://soundcloud.com' },
    { name: 'Spotify', icon: 'fab fa-spotify', color: '#1DB954', url: 'https://spotify.com' },
    { name: 'Vimeo', icon: 'fab fa-vimeo', color: '#1AB7EA', url: 'https://vimeo.com' },
    { name: 'Dailymotion', icon: 'fab fa-dailymotion', color: '#0066DC', url: 'https://dailymotion.com' },
    { name: 'Twitch', icon: 'fab fa-twitch', color: '#9146FF', url: 'https://twitch.tv' },
    { name: 'Pinterest', icon: 'fab fa-pinterest', color: '#E60023', url: 'https://pinterest.com' },
    { name: 'Reddit', icon: 'fab fa-reddit', color: '#FF4500', url: 'https://reddit.com' },
    { name: 'LinkedIn', icon: 'fab fa-linkedin', color: '#0077B5', url: 'https://linkedin.com' },
    { name: 'Snapchat', icon: 'fab fa-snapchat', color: '#FFFC00', url: 'https://snapchat.com' },
    { name: 'News', icon: 'fas fa-newspaper', color: '#3498DB', url: 'https://news.google.com' },
    { name: 'Bookmark', icon: 'fas fa-bookmark', color: '#F39C12', url: '#' },
    { name: 'Daily News', icon: 'fas fa-newspaper', color: '#E74C3C', url: 'https://news.google.com' },
    { name: 'Win Cash', icon: 'fas fa-coins', color: '#2ECC71', url: '#' },
    { name: 'Status Saver', icon: 'fas fa-save', color: '#9B59B6', url: '#' }
];

// Custom websites storage
let customWebsites = JSON.parse(localStorage.getItem('customWebsites') || '[]');

// --- DOM ELEMENTS ---
const input = document.getElementById('inputUrl');
const bottomSheet = document.getElementById('bottomSheet');
const downloadBtn = document.getElementById('downloadBtn');
const searchSection = document.querySelector('.hero-container');
const menu = document.getElementById('menu');
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
const loadingSpinner = document.getElementById('loadingSpinner');

// New elements for video details and search results
const videoDetailsSection = document.getElementById('videoDetailsSection');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoChannel = document.getElementById('videoChannel');
const videoViews = document.getElementById('videoViews');
const videoDuration = document.getElementById('videoDuration');
const videoUploadDate = document.getElementById('videoUploadDate');
const videoDescription = document.getElementById('videoDescription');
const formatOptions = document.getElementById('formatOptions');
const downloadVideoBtn = document.getElementById('downloadVideoBtn');
const searchResultsSection = document.getElementById('searchResultsSection');
const searchResultsContainer = document.getElementById('searchResultsContainer');

// New elements for app launcher, browser mode, and direct search
const appLauncherSection = document.getElementById('appLauncherSection');
const browserSection = document.getElementById('browserSection');
const directSearchSection = document.getElementById('directSearchSection');
const appsGrid = document.getElementById('appsGrid');
const browserUrlInput = document.getElementById('browserUrlInput');
const browserIframe = document.getElementById('browserIframe');
const browserResults = document.getElementById('browserResults');
const directSearchInput = document.getElementById('directSearchInput');
const directSearchResults = document.getElementById('directSearchResults');

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
        // Automatically process the pasted URL
        processInput();
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
    
    // Fetch video details
    await fetchVideoDetails(val);
}

// Fetch Video Details
async function fetchVideoDetails(url) {
    showLoadingSpinner(true);
    
    try {
        // Simulate API call to fetch video details
        const videoData = await simulateVideoDetailsAPI(url);
        
        // Update video details section
        updateVideoDetailsSection(videoData);
        
        // Show video details section
        showVideoDetailsSection();
        
        // Update download count
        const count = parseInt(downloadCount.innerText.replace(/[^0-9]/g, '')) + 1;
        downloadCount.innerText = `${count.toLocaleString()} Downloads Today`;
        
        showNotification('Video Details Loaded', 'Video information retrieved successfully');
    } catch (error) {
        showNotification('Error', 'Failed to fetch video details. Please try again.');
        console.error('Error fetching video details:', error);
    } finally {
        showLoadingSpinner(false);
    }
}

// Simulate Video Details API
async function simulateVideoDetailsAPI(url) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock video data based on platform
    const platform = detectPlatform(url);
    const mockData = {
        youtube: {
            title: 'Amazing Nature Documentary - 4K Ultra HD',
            channel: 'Nature Explorers',
            views: '1,245,832',
            duration: '15:42',
            uploadDate: '2023-10-15',
            description: 'Explore the breathtaking beauty of nature in this stunning 4K documentary. Witness incredible landscapes and wildlife from around the world.',
            thumbnail: 'https://picsum.photos/seed/nature-doc/800/450.jpg',
            formats: [
                { name: 'MP3 (128kbps)', size: '14.2 MB', format: 'mp3', quality: '128' },
                { name: 'MP3 (320kbps)', size: '35.5 MB', format: 'mp3', quality: '320' },
                { name: '360p', size: '45.8 MB', format: 'mp4', quality: '360p' },
                { name: '720p HD', size: '125.4 MB', format: 'mp4', quality: '720p' },
                { name: '1080p Full HD', size: '245.7 MB', format: 'mp4', quality: '1080p' },
                { name: '4K Ultra HD', size: '1.2 GB', format: 'mp4', quality: '2160p' }
            ]
        },
        instagram: {
            title: 'Beautiful Sunset at the Beach',
            channel: 'Travel Diary',
            views: '124,532',
            duration: '0:30',
            uploadDate: '2023-10-20',
            description: 'Captured this amazing sunset during my vacation. The colors were absolutely stunning!',
            thumbnail: 'https://picsum.photos/seed/sunset-beach/800/450.jpg',
            formats: [
                { name: 'MP3 (128kbps)', size: '0.7 MB', format: 'mp3', quality: '128' },
                { name: '360p', size: '2.1 MB', format: 'mp4', quality: '360p' },
                { name: '720p HD', size: '5.8 MB', format: 'mp4', quality: '720p' }
            ]
        },
        tiktok: {
            title: 'Funny Dance Challenge',
            channel: 'Dance Master',
            views: '2,845,123',
            duration: '0:15',
            uploadDate: '2023-10-22',
            description: 'Trying out the latest dance trend! Who else wants to join me?',
            thumbnail: 'https://picsum.photos/seed/dance-challenge/800/450.jpg',
            formats: [
                { name: 'MP3 (128kbps)', size: '0.4 MB', format: 'mp3', quality: '128' },
                { name: '360p (No Watermark)', size: '1.2 MB', format: 'mp4', quality: '360p' },
                { name: '720p HD (No Watermark)', size: '3.5 MB', format: 'mp4', quality: '720p' }
            ]
        },
        sora: {
            title: 'AI Generated Fantasy World',
            channel: 'Sora AI Creations',
            views: '542,189',
            duration: '0:45',
            uploadDate: '2023-10-18',
            description: 'Generated using OpenAI\'s Sora model. Prompt: "A mystical fantasy world with floating islands and magical creatures"',
            thumbnail: 'https://picsum.photos/seed/fantasy-world/800/450.jpg',
            formats: [
                { name: 'AI Prompt Extract', size: '0.1 MB', format: 'txt', quality: 'prompt' },
                { name: '360p', size: '3.2 MB', format: 'mp4', quality: '360p' },
                { name: '720p HD', size: '8.7 MB', format: 'mp4', quality: '720p' },
                { name: '1080p Full HD', size: '18.5 MB', format: 'mp4', quality: '1080p' },
                { name: '4K Upscaled', size: '45.2 MB', format: 'mp4', quality: '2160p' }
            ]
        }
    };
    
    // Return mock data for the detected platform or default to YouTube
    return mockData[platform] || mockData.youtube;
}

// Update Video Details Section
function updateVideoDetailsSection(videoData) {
    videoThumbnail.src = videoData.thumbnail;
    videoTitle.textContent = videoData.title;
    videoChannel.textContent = videoData.channel;
    videoViews.textContent = formatViewCount(videoData.views);
    videoDuration.textContent = videoData.duration;
    videoUploadDate.textContent = formatDate(videoData.uploadDate);
    videoDescription.textContent = videoData.description;
    
    // Clear existing format options
    formatOptions.innerHTML = '';
    
    // Add format options
    videoData.formats.forEach((format, index) => {
        const formatOption = document.createElement('div');
        formatOption.className = 'format-option';
        formatOption.onclick = () => selectFormat(formatOption, format);
        
        formatOption.innerHTML = `
            <div class="format-info">
                <span class="format-name">${format.name}</span>
                <span class="format-size">${format.size}</span>
            </div>
            <div class="format-radio">
                <input type="radio" name="video-format" value="${format.format}" ${index === 0 ? 'checked' : ''}>
            </div>
        `;
        
        formatOptions.appendChild(formatOption);
    });
    
    // Store video data for download
    currentVideoData = videoData;
}

// Select Format
function selectFormat(element, format) {
    // Remove selected class from all options
    document.querySelectorAll('.format-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    element.classList.add('selected');
    
    // Update selected format
    selectedFormat = format.format;
    selectedQuality = format.quality;
    
    // Enable download button
    downloadVideoBtn.disabled = false;
}

// Show Video Details Section
function showVideoDetailsSection() {
    // Hide other sections
    searchSection.style.display = 'none';
    document.querySelector('.seo-content').style.display = 'none';
    document.querySelector('.ad-banner').style.display = 'none';
    publicLinkSection.classList.add('hidden');
    downloadHistorySection.classList.add('hidden');
    appLauncherSection.classList.add('hidden');
    browserSection.classList.add('hidden');
    directSearchSection.classList.add('hidden');
    searchResultsSection.classList.add('hidden');
    
    // Show video details section
    videoDetailsSection.classList.remove('hidden');
}

// Close Video Details Section
function closeVideoDetails() {
    videoDetailsSection.classList.add('hidden');
    searchSection.style.display = 'block';
    document.querySelector('.seo-content').style.display = 'block';
    document.querySelector('.ad-banner').style.display = 'block';
}

// Search Media Function
async function searchMedia(query) {
    showLoadingSpinner(true);
    
    try {
        // Simulate API call to search for media
        const searchResults = await simulateSearchAPI(query);
        
        // Update search results section
        updateSearchResultsSection(searchResults, query);
        
        // Show search results section
        showSearchResultsSection();
        
        showNotification('Search Complete', `Found ${searchResults.length} results for "${query}"`);
    } catch (error) {
        showNotification('Error', 'Failed to search. Please try again.');
        console.error('Error searching media:', error);
    } finally {
        showLoadingSpinner(false);
    }
}

// Simulate Search API
async function simulateSearchAPI(query) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock search results
    return [
        {
            title: `${query} - Official Music Video`,
            channel: 'Music Channel',
            views: '12,456,789',
            duration: '3:45',
            thumbnail: 'https://picsum.photos/seed/music1/300/180.jpg',
            platform: 'YouTube'
        },
        {
            title: `${query} - Cover Version`,
            channel: 'Cover Artist',
            views: '3,456,123',
            duration: '4:20',
            thumbnail: 'https://picsum.photos/seed/music2/300/180.jpg',
            platform: 'YouTube'
        },
        {
            title: `${query} - Live Performance`,
            channel: 'Live Concerts',
            views: '8,765,432',
            duration: '5:15',
            thumbnail: 'https://picsum.photos/seed/music3/300/180.jpg',
            platform: 'YouTube'
        },
        {
            title: `${query} - Dance Cover`,
            channel: 'Dance Studio',
            views: '5,432,109',
            duration: '2:30',
            thumbnail: 'https://picsum.photos/seed/dance1/300/180.jpg',
            platform: 'TikTok'
        },
        {
            title: `${query} - Remix`,
            channel: 'DJ Producer',
            views: '2,345,678',
            duration: '3:15',
            thumbnail: 'https://picsum.photos/seed/remix1/300/180.jpg',
            platform: 'SoundCloud'
        },
        {
            title: `${query} - Acoustic Version`,
            channel: 'Acoustic Sessions',
            views: '1,234,567',
            duration: '4:00',
            thumbnail: 'https://picsum.photos/seed/acoustic1/300/180.jpg',
            platform: 'Spotify'
        }
    ];
}

// Update Search Results Section
function updateSearchResultsSection(searchResults, query) {
    // Clear existing results
    searchResultsContainer.innerHTML = '';
    
    // Add search results
    searchResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        resultItem.innerHTML = `
            <div class="search-result-thumbnail">
                <img src="${result.thumbnail}" alt="${result.title}">
            </div>
            <div class="search-result-info">
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-meta">
                    <span><i class="fas fa-user"></i> ${result.channel}</span>
                    <span><i class="fas fa-eye"></i> ${formatViewCount(result.views)}</span>
                    <span><i class="fas fa-clock"></i> ${result.duration}</span>
                    <span><i class="fas fa-globe"></i> ${result.platform}</span>
                </div>
            </div>
            <div class="search-result-actions">
                <button class="search-result-btn" onclick="downloadFromSearchResult('${result.title}', '${result.platform}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
        
        searchResultsContainer.appendChild(resultItem);
    });
}

// Show Search Results Section
function showSearchResultsSection() {
    // Hide other sections
    searchSection.style.display = 'none';
    document.querySelector('.seo-content').style.display = 'none';
    document.querySelector('.ad-banner').style.display = 'none';
    publicLinkSection.classList.add('hidden');
    downloadHistorySection.classList.add('hidden');
    appLauncherSection.classList.add('hidden');
    browserSection.classList.add('hidden');
    directSearchSection.classList.add('hidden');
    videoDetailsSection.classList.add('hidden');
    
    // Show search results section
    searchResultsSection.classList.remove('hidden');
}

// Close Search Results Section
function closeSearchResults() {
    searchResultsSection.classList.add('hidden');
    searchSection.style.display = 'block';
    document.querySelector('.seo-content').style.display = 'block';
    document.querySelector('.ad-banner').style.display = 'block';
}

// Download from Search Result
function downloadFromSearchResult(title, platform) {
    // In a real implementation, this would fetch the actual URL and details
    // For now, we'll simulate it
    showNotification('Processing', `Preparing download for "${title}"...`);
    
    setTimeout(() => {
        // Simulate getting video details
        const mockVideoData = {
            title: title,
            channel: `${platform} Channel`,
            views: '1,000,000',
            duration: '3:45',
            uploadDate: '2023-10-20',
            description: `This is a great ${platform} video that you'll love!`,
            thumbnail: 'https://picsum.photos/seed/download/800/450.jpg',
            formats: [
                { name: 'MP3 (128kbps)', size: '3.2 MB', format: 'mp3', quality: '128' },
                { name: 'MP3 (320kbps)', size: '8.1 MB', format: 'mp3', quality: '320' },
                { name: '360p', size: '12.5 MB', format: 'mp4', quality: '360p' },
                { name: '720p HD', size: '35.4 MB', format: 'mp4', quality: '720p' },
                { name: '1080p Full HD', size: '68.7 MB', format: 'mp4', quality: '1080p' }
            ]
        };
        
        // Update video details section
        updateVideoDetailsSection(mockVideoData);
        
        // Show video details section
        showVideoDetailsSection();
        
        showNotification('Ready to Download', 'Select your preferred format and quality');
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
    
    // Close video details section
    closeVideoDetails();
    
    // Create a unique ID for this download
    publicLinkId = generateUniqueId();
    
    // Generate title based on platform
    currentTitle = currentVideoData.title;
    
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
    appLauncherSection.classList.add('hidden');
    browserSection.classList.add('hidden');
    directSearchSection.classList.add('hidden');
    videoDetailsSection.classList.add('hidden');
    searchResultsSection.classList.add('hidden');
    
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
    
    // Calculate and display file size
    const fileSize = calculateFileSize(downloadData.format, downloadData.quality);
    document.getElementById('downloadSize').textContent = fileSize;
}

// Calculate file size based on format and quality
function calculateFileSize(format, quality) {
    // Mock file size calculation based on format and quality
    const sizeMap = {
        'mp3': {
            '128': '3.2 MB',
            '320': '8.1 MB'
        },
        'mp4': {
            '360p': '12.5 MB',
            '720p': '35.4 MB',
            '1080p': '68.7 MB',
            '2160p': '245.8 MB'
        },
        'txt': {
            'prompt': '0.1 MB'
        }
    };
    
    return sizeMap[format]?.[quality] || 'Unknown size';
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
    appLauncherSection.classList.add('hidden');
    browserSection.classList.add('hidden');
    directSearchSection.classList.add('hidden');
    videoDetailsSection.classList.add('hidden');
    searchResultsSection.classList.add('hidden');
    
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
    downloadHistory.forEach((item, index) => {
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
            historyList.appendChild(adBanner);
        }
        
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

// Show/Hide Loading Spinner
function showLoadingSpinner(show) {
    if (show) {
        loadingSpinner.classList.add('show');
    } else {
        loadingSpinner.classList.remove('show');
    }
}

// Format view count
function formatViewCount(views) {
    const num = parseInt(views.replace(/,/g, ''));
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return views;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
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

// App Launcher Functions
function showAppLauncher() {
    // Hide other sections
    searchSection.style.display = 'none';
    document.querySelector('.seo-content').style.display = 'none';
    document.querySelector('.ad-banner').style.display = 'none';
    publicLinkSection.classList.add('hidden');
    downloadHistorySection.classList.add('hidden');
    browserSection.classList.add('hidden');
    directSearchSection.classList.add('hidden');
    videoDetailsSection.classList.add('hidden');
    searchResultsSection.classList.add('hidden');
    
    // Show app launcher section
    appLauncherSection.classList.remove('hidden');
    
    // Load apps
    loadAppLauncherApps();
    
    // Close menu
    menu.classList.remove('show');
}

function closeAppLauncher() {
    appLauncherSection.classList.add('hidden');
    searchSection.style.display = 'block';
    document.querySelector('.seo-content').style.display = 'block';
    document.querySelector('.ad-banner').style.display = 'block';
}

function loadAppLauncherApps() {
    appsGrid.innerHTML = '';
    
    // Combine default apps with custom websites
    const allApps = [...appLauncherApps, ...customWebsites];
    
    allApps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-item';
        appItem.onclick = () => openApp(app);
        
        appItem.innerHTML = `
            <div class="app-icon" style="background: ${app.color}">
                <i class="${app.icon}"></i>
            </div>
            <div class="app-name">${app.name}</div>
        `;
        
        appsGrid.appendChild(appItem);
    });
}

function openApp(app) {
    if (app.url === '#') {
        showNotification('Coming Soon', `${app.name} will be available soon!`);
        return;
    }
    
    // For specific apps, open in browser mode
    if (['YouTube', 'Instagram', 'TikTok', 'Facebook', 'Twitter', 'Telegram', 'SoundCloud', 'Spotify'].includes(app.name)) {
        showBrowser();
        browserUrlInput.value = app.url;
        loadBrowserUrl();
    } else {
        // For other apps, open direct search
        showDirectSearch();
    }
}

// Show Add Website Modal
function showAddWebsiteModal() {
    document.getElementById('addWebsiteModal').classList.add('show');
}

// Close Add Website Modal
function closeAddWebsiteModal() {
    document.getElementById('addWebsiteModal').classList.remove('show');
}

// Add Custom Website
function addCustomWebsite() {
    const name = document.getElementById('websiteName').value.trim();
    const url = document.getElementById('websiteUrl').value.trim();
    const icon = document.getElementById('websiteIcon').value.trim() || 'fas fa-globe';
    const color = document.getElementById('websiteColor').value;
    
    if (!name || !url) {
        showNotification('Error', 'Please enter website name and URL');
        return;
    }
    
    // Add https:// if not present
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        finalUrl = 'https://' + url;
    }
    
    // Create new website object
    const newWebsite = {
        name: name,
        url: finalUrl,
        icon: icon,
        color: color,
        isCustom: true
    };
    
    // Add to custom websites array
    customWebsites.push(newWebsite);
    
    // Save to localStorage
    localStorage.setItem('customWebsites', JSON.stringify(customWebsites));
    
    // Reload app launcher
    loadAppLauncherApps();
    
    // Close modal
    closeAddWebsiteModal();
    
    // Clear form
    document.getElementById('websiteName').value = '';
    document.getElementById('websiteUrl').value = '';
    document.getElementById('websiteIcon').value = '';
    document.getElementById('websiteColor').value = '#667eea';
    
    showNotification('Success', 'Website added successfully!');
}

// Browser Mode Functions
function showBrowser() {
    // Hide other sections
    searchSection.style.display = 'none';
    document.querySelector('.seo-content').style.display = 'none';
    document.querySelector('.ad-banner').style.display = 'none';
    publicLinkSection.classList.add('hidden');
    downloadHistorySection.classList.add('hidden');
    appLauncherSection.classList.add('hidden');
    directSearchSection.classList.add('hidden');
    videoDetailsSection.classList.add('hidden');
    searchResultsSection.classList.add('hidden');
    
    // Show browser section
    browserSection.classList.remove('hidden');
    
    // Close menu
    menu.classList.remove('show');
}

function closeBrowser() {
    browserSection.classList.add('hidden');
    searchSection.style.display = 'block';
    document.querySelector('.seo-content').style.display = 'block';
    document.querySelector('.ad-banner').style.display = 'block';
}

function loadBrowserUrl() {
    const url = browserUrlInput.value.trim();
    if (!url) return;
    
    // Add https:// if not present
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        finalUrl = 'https://' + url;
    }
    
    // Load URL in iframe
    browserIframe.src = finalUrl;
    
    // Clear previous results
    browserResults.innerHTML = '';
    
    showNotification('Browser', 'Loading website...');
}

function extractMediaFromBrowser() {
    // Simulate media extraction
    showNotification('Extracting', 'Finding media on this page...');
    
    setTimeout(() => {
        // Mock results
        const mockResults = [
            { title: 'Video 1', duration: '3:45', size: '12MB' },
            { title: 'Video 2', duration: '5:20', size: '18MB' },
            { title: 'Audio 1', duration: '2:30', size: '4MB' },
            { title: 'Audio 2', duration: '4:15', size: '7MB' },
            { title: 'Video 3', duration: '7:10', size: '25MB' },
            { title: 'Video 4', duration: '2:55', size: '9MB' },
            { title: 'Audio 3', duration: '3:20', size: '5MB' },
            { title: 'Video 5', duration: '4:45', size: '15MB' },
            { title: 'Audio 4', duration: '2:10', size: '3MB' },
            { title: 'Video 6', duration: '6:30', size: '22MB' }
        ];
        
        // Display results with ad banners
        browserResults.innerHTML = '';
        
        mockResults.forEach((result, index) => {
            // Add ad banner after every 4 results
            if (index > 0 && index % 4 === 0) {
                const adBanner = document.createElement('div');
                adBanner.className = 'browser-result-item';
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
                browserResults.appendChild(adBanner);
            }
            
            const resultItem = document.createElement('div');
            resultItem.className = 'browser-result-item';
            resultItem.innerHTML = `
                <div class="browser-result-thumbnail">
                    <i class="fas fa-${result.title.includes('Audio') ? 'music' : 'video'}"></i>
                </div>
                <div class="browser-result-info">
                    <div class="browser-result-title">${result.title}</div>
                    <div class="browser-result-meta">
                        <span><i class="fas fa-clock"></i> ${result.duration}</span>
                        <span><i class="fas fa-file"></i> ${result.size}</span>
                    </div>
                </div>
                <div class="browser-result-actions">
                    <button class="browser-result-btn" onclick="downloadFromBrowser('${result.title}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `;
            browserResults.appendChild(resultItem);
        });
        
        showNotification('Extraction Complete', `Found ${mockResults.length} media files`);
    }, 2000);
}

function downloadFromBrowser(title) {
    // Simulate download from browser
    showNotification('Download Started', `Downloading ${title}...`);
    
    setTimeout(() => {
        showNotification('Download Complete', `${title} downloaded successfully!`);
        
        // Add to download history
        const downloadData = {
            id: generateUniqueId(),
            url: browserUrlInput.value,
            title: title,
            platform: 'Browser',
            format: 'video',
            quality: 'high',
            isShortContent: false,
            timestamp: new Date().toISOString()
        };
        
        addToDownloadHistory(downloadData);
    }, 2000);
}

// Direct Search Functions
function showDirectSearch() {
    // Hide other sections
    searchSection.style.display = 'none';
    document.querySelector('.seo-content').style.display = 'none';
    document.querySelector('.ad-banner').style.display = 'none';
    publicLinkSection.classList.add('hidden');
    downloadHistorySection.classList.add('hidden');
    appLauncherSection.classList.add('hidden');
    browserSection.classList.add('hidden');
    videoDetailsSection.classList.add('hidden');
    searchResultsSection.classList.add('hidden');
    
    // Show direct search section
    directSearchSection.classList.remove('hidden');
    
    // Close menu
    menu.classList.remove('show');
}

function closeDirectSearch() {
    directSearchSection.classList.add('hidden');
    searchSection.style.display = 'block';
    document.querySelector('.seo-content').style.display = 'block';
    document.querySelector('.ad-banner').style.display = 'block';
}

function performDirectSearch() {
    const query = directSearchInput.value.trim();
    if (!query) return;
    
    showNotification('Searching', `Finding: ${query}`);
    
    // Simulate search
    setTimeout(() => {
        // Mock results
        const mockResults = [
            { title: `${query} - Official Video`, platform: 'YouTube', duration: '3:45', views: '1.2M' },
            { title: `${query} - Audio Version`, platform: 'Spotify', duration: '3:45', views: '800K' },
            { title: `${query} - TikTok Remix`, platform: 'TikTok', duration: '0:45', views: '5.2M' },
            { title: `${query} - Live Performance`, platform: 'YouTube', duration: '5:20', views: '2.4M' },
            { title: `${query} - Cover Version`, platform: 'Instagram', duration: '2:30', views: '450K' },
            { title: `${query} - Lyric Video`, platform: 'YouTube', duration: '3:45', views: '3.1M' },
            { title: `${query} - Dance Cover`, platform: 'TikTok', duration: '1:00', views: '8.7M' },
            { title: `${query} - Acoustic Version`, platform: 'SoundCloud', duration: '4:15', views: '320K' },
            { title: `${query} - Remix`, platform: 'Spotify', duration: '3:20', views: '680K' },
            { title: `${query} - Behind the Scenes`, platform: 'YouTube', duration: '7:10', views: '1.8M' }
        ];
        
        // Display results
        directSearchResults.innerHTML = '';
        
        mockResults.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'direct-search-item';
            resultItem.innerHTML = `
                <div class="direct-search-thumbnail">
                    <i class="fas fa-${result.platform === 'Spotify' || result.platform === 'SoundCloud' ? 'music' : 'video'}"></i>
                </div>
                <div class="direct-search-info">
                    <div class="direct-search-title">${result.title}</div>
                    <div class="direct-search-meta">
                        <span><i class="fas fa-globe"></i> ${result.platform}</span>
                        <span><i class="fas fa-clock"></i> ${result.duration}</span>
                        <span><i class="fas fa-eye"></i> ${result.views}</span>
                    </div>
                </div>
                <div class="direct-search-actions">
                    <button class="direct-search-btn" onclick="downloadFromDirectSearch('${result.title}', '${result.platform}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `;
            directSearchResults.appendChild(resultItem);
        });
        
        showNotification('Search Complete', `Found ${mockResults.length} results`);
    }, 1500);
}

function downloadFromDirectSearch(title, platform) {
    // Simulate download from direct search
    showNotification('Download Started', `Downloading ${title}...`);
    
    setTimeout(() => {
        showNotification('Download Complete', `${title} downloaded successfully!`);
        
        // Add to download history
        const downloadData = {
            id: generateUniqueId(),
            url: 'https://example.com',
            title: title,
            platform: platform,
            format: 'video',
            quality: 'high',
            isShortContent: false,
            timestamp: new Date().toISOString()
        };
        
        addToDownloadHistory(downloadData);
    }, 2000);
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

// Variable to store current video data
let currentVideoData = {};
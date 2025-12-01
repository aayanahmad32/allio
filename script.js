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

// API Configuration
const API_CONFIG = {
    RAPIDAPI_KEY: 'YOUR_RAPIDAPI_KEY', // Replace with your actual RapidAPI key
    YOUTUBE_API_KEY: 'YOUR_YOUTUBE_API_KEY', // Replace with your actual YouTube API key
    BASE_URL: 'https://allio-delta.vercel.app'
};

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

// Variable to store current video data
let currentVideoData = {};

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

// Set platform for quick access
function setPlatform(platform) {
    currentPlatform = platform;
    const platformUrls = {
        youtube: 'https://youtube.com',
        instagram: 'https://instagram.com',
        tiktok: 'https://tiktok.com',
        facebook: 'https://facebook.com',
        twitter: 'https://twitter.com',
        telegram: 'https://telegram.org',
        soundcloud: 'https://soundcloud.com',
        spotify: 'https://spotify.com'
    };
    
    input.placeholder = `Search ${platform.charAt(0).toUpperCase() + platform.slice(1)} or paste URL...`;
    input.focus();
    
    // Highlight selected platform
    document.querySelectorAll('.platform-item').forEach(item => {
        item.style.background = 'rgba(255, 255, 255, 0.03)';
        item.style.border = '1px solid var(--glass-border)';
    });
    
    event.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
    event.currentTarget.style.border = '1px solid rgba(102, 126, 234, 0.5)';
    
    showNotification('Platform Selected', `Now searching on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
}

// Enhanced Search Function with API Integration
async function processInput() {
    const val = input.value.trim();
    if(!val) return;

    // Check if it's a URL or search term
    const isUrl = /^https?:\/\/.+/i.test(val);
    
    if (!isUrl) {
        // Search for song/video using API
        await searchMedia(val);
        return;
    }

    // Check if it's a short content (reels, shorts, etc.)
    isShortContent = checkIfShortContent(val);
    
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
    
    // Fetch video details using API
    await fetchVideoDetails(val);
}

// Fetch Video Details with API Integration
async function fetchVideoDetails(url) {
    showLoadingSpinner(true);
    
    try {
        // Try to fetch from API first
        const videoData = await fetchVideoFromAPI(url);
        
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

// Fetch video from API
async function fetchVideoFromAPI(url) {
    const platform = detectPlatform(url);
    
    // For YouTube videos, use YouTube API
    if (platform === 'youtube') {
        const videoId = extractYouTubeVideoId(url);
        if (videoId) {
            return await fetchYouTubeVideoDetails(videoId);
        }
    }
    
    // For other platforms, use RapidAPI or fallback to mock data
    return await simulateVideoDetailsAPI(url);
}

// Extract YouTube video ID from URL
function extractYouTubeVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : false;
}

// Fetch YouTube video details using API
async function fetchYouTubeVideoDetails(videoId) {
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${API_CONFIG.YOUTUBE_API_KEY}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            return {
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                views: item.statistics.viewCount,
                duration: formatDuration(item.contentDetails.duration),
                uploadDate: item.snippet.publishedAt,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.high.url,
                formats: [
                    { name: 'MP3 (128kbps)', size: '3.2 MB', format: 'mp3', quality: '128' },
                    { name: 'MP3 (320kbps)', size: '8.1 MB', format: 'mp3', quality: '320' },
                    { name: '360p', size: '12.5 MB', format: 'mp4', quality: '360p' },
                    { name: '720p HD', size: '35.4 MB', format: 'mp4', quality: '720p' },
                    { name: '1080p Full HD', size: '68.7 MB', format: 'mp4', quality: '1080p' },
                    { name: '4K Ultra HD', size: '245.8 MB', format: 'mp4', quality: '2160p' }
                ]
            };
        }
    } catch (error) {
        console.error('YouTube API error:', error);
    }
    
    // Fallback to mock data
    return await simulateVideoDetailsAPI(url);
}

// Format YouTube duration
function formatDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Simulate Video Details API (Fallback)
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

// Search Media Function with API Integration
async function searchMedia(query) {
    showLoadingSpinner(true);
    
    try {
        // Try to fetch from API first
        const searchResults = await searchMediaFromAPI(query);
        
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

// Search media from API
async function searchMediaFromAPI(query) {
    try {
        // For YouTube search, use YouTube API
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(query)}&part=snippet&type=video&maxResults=10&key=${API_CONFIG.YOUTUBE_API_KEY}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            return data.items.map(item => ({
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                views: 'N/A',
                duration: 'N/A',
                thumbnail: item.snippet.thumbnails.medium.url,
                platform: 'YouTube',
                videoId: item.id.videoId
            }));
        }
    } catch (error) {
        console.error('Search API error:', error);
    }
    
    // Fallback to mock data
    return await simulateSearchAPI(query);
}

// Simulate Search API (Fallback)
async function simulateSearchAPI(query) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock search results
    return [
        {
            title: `${query} - Official Video`,
            channel: 'Music Channel',
            views: '12,456,789',
            duration: '3:45',
            thumbnail: `https://picsum.photos/seed/${query}-1/300/180.jpg`,
            platform: 'YouTube'
        },
        {
            title: `${query} - Audio Version`,
            channel: 'Audio Artist',
            views: '800,000',
            duration: '3:45',
            thumbnail: `https://picsum.photos/seed/${query}-2/300/180.jpg`,
            platform: 'Spotify'
        },
        {
            title: `${query} - TikTok Remix`,
            channel: 'TikTok Creator',
            views: '5,200,000',
            duration: '0:45',
            thumbnail: `https://picsum.photos/seed/${query}-3/300/180.jpg`,
            platform: 'TikTok'
        },
        {
            title: `${query} - Live Performance`,
            channel: 'Live Concerts',
            views: '2,400,000',
            duration: '5:20',
            thumbnail: `https://picsum.photos/seed/${query}-4/300/180.jpg`,
            platform: 'YouTube'
        },
        {
            title: `${query} - Cover Version`,
            channel: 'Cover Artist',
            views: '450,000',
            duration: '2:30',
            thumbnail: `https://picsum.photos/seed/${query}-5/300/180.jpg`,
            platform: 'Instagram'
        },
        {
            title: `${query} - Lyric Video`,
            channel: 'Lyric Channel',
            views: '3,100,000',
            duration: '3:45',
            thumbnail: `https://picsum.photos/seed/${query}-6/300/180.jpg`,
            platform: 'YouTube'
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
                <button class="search-result-btn" onclick="downloadFromSearchResult('${result.title}', '${result.platform}', '${result.videoId || ''}')">
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
function downloadFromSearchResult(title, platform, videoId) {
    // If we have a YouTube video ID, construct the URL
    if (platform === 'YouTube' && videoId) {
        currentUrl = `https://youtube.com/watch?v=${videoId}`;
    } else {
        currentUrl = 'https://example.com';
    }
    
    currentTitle = title;
    currentPlatform = platform;
    
    // Fetch video details
    fetchVideoDetails(currentUrl);
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

// Generate public link with API Integration
async function generatePublicLink() {
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
    
    try {
        // Try to get actual download link from API
        const downloadLink = await getDownloadLink(currentUrl, selectedFormat, selectedQuality);
        
        // Create download data
        const downloadData = {
            id: publicLinkId,
            url: currentUrl,
            title: currentTitle,
            platform: currentPlatform,
            format: selectedFormat,
            quality: selectedQuality,
            downloadLink: downloadLink,
            isShortContent: false,
            timestamp: new Date().toISOString()
        };
        
        // Store in localStorage (simulate backend)
        localStorage.setItem(`download_${publicLinkId}`, JSON.stringify(downloadData));
        
        // Show public link section
        showPublicLinkSection(downloadData);
        
        // Add to history
        addToDownloadHistory(downloadData);
        
        showNotification('Link Generated', 'Your download link is ready!');
    } catch (error) {
        showNotification('Error', 'Failed to generate download link');
        console.error('Error generating download link:', error);
    }
}

// Get download link from API
async function getDownloadLink(url, format, quality) {
    // This would integrate with a real API like RapidAPI
    // For now, return a mock download link
    return `${API_CONFIG.BASE_URL}/api/download?url=${encodeURIComponent(url)}&format=${format}&quality=${quality}`;
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
    
    // If we have a direct download link, trigger download
    if (downloadData.downloadLink) {
        triggerDownload(downloadData.downloadLink, downloadData.title);
    } else {
        // Simulate download
        simulateDownload(downloadData.format, downloadData.title);
    }
    
    // Update history with download status
    updateDownloadHistoryStatus(publicLinkId, 'completed');
}

// Trigger actual file download
function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showNotification('Download Started', 'Your download has started');
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
        </div>
    `;
    pageModal.classList.add('show');
}

// Share via WhatsApp
function shareViaWhatsApp() {
    const text = "Check out ALLIO PRO - The ultimate media downloader! https://allio-delta.vercel.app/?ref=share";
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showNotification('Sharing', 'Opening WhatsApp...');
}

// Share via Telegram
function shareViaTelegram() {
    const text = "Check out ALLIO PRO - The ultimate media downloader! https://allio-delta.vercel.app/?ref=share";
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
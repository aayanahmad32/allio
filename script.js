// --- UI STATE VARIABLES ---
let currentMode = 'video';
let lyricsEnabled = true;
let privateMode = false;
let selectedFormat = 'video';
let selectedQuality = 'high';
let isShortContent = false;
let browserHistory = [];
let browserHistoryIndex = -1;
let currentLanguage = 'en';
let currentPlatform = '';
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
const dashboard = document.getElementById('dashboard');
const searchSection = document.querySelector('.hero-container');
const menu = document.getElementById('menu');
const browserUrl = document.getElementById('browserUrl');
const browserPlaceholder = document.getElementById('browserPlaceholder');
const langDropdown = document.getElementById('langDropdown');
const currentLang = document.getElementById('currentLang');
const aiParsing = document.getElementById('aiParsing');
const aiParsingFill = document.getElementById('aiParsingFill');
const aiParsingStatus = document.getElementById('aiParsingStatus');

const videoOpts = document.getElementById('video-opts');
const audioOpts = document.getElementById('audio-opts');
const playlistOpts = document.getElementById('playlist-opts');
const soraOpts = document.getElementById('sora-opts');
const browserOpts = document.getElementById('browser-opts');
const lyricsToggle = document.getElementById('lyricsToggle');
const lyricsStatus = document.getElementById('lyricsStatus');
const dlBtn = document.getElementById('dlBtn');
const equalizer = document.getElementById('equalizer');
const notification = document.getElementById('notification');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const popupOverlay = document.getElementById('popupOverlay');
const lyricsTag = document.getElementById('lyricsTag');
const aiTag = document.getElementById('aiTag');
const downloadCount = document.getElementById('downloadCount');
const settingsModal = document.getElementById('settingsModal');
const pageModal = document.getElementById('pageModal');
const pageModalTitle = document.getElementById('pageModalTitle');
const pageModalContent = document.getElementById('pageModalContent');

// Popup elements
const platformHeader = document.getElementById('platformHeader');
const platformIcon = document.getElementById('platformIcon');
const platformName = document.getElementById('platformName');
const platformDesc = document.getElementById('platformDesc');
const formatGrid = document.getElementById('formatGrid');
const popupLyricsOption = document.getElementById('popupLyricsOption');
const popupLyricsSwitch = document.getElementById('popupLyricsSwitch');
const platformSpecificOptions = document.getElementById('platformSpecificOptions');
const setDefaultCheckbox = document.getElementById('setDefaultCheckbox');
const defaultFormatPreview = document.getElementById('defaultFormatPreview');
const defaultQualityPreview = document.getElementById('defaultQualityPreview');
const platformNameText = document.getElementById('platformNameText');
const platformNameCheckbox = document.getElementById('platformNameCheckbox');

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

// Handle Input / Search
function processInput() {
    const val = input.value.trim();
    if(!val) return;

    // Check if it's a short content (reels, shorts, etc.)
    isShortContent = checkIfShortContent(val);
    
    // Check if it's a Sora 2 AI content
    const isSoraContent = checkIfSoraContent(val);
    
    // Check platform type
    currentPlatform = detectPlatform(val);
    
    if (isShortContent) {
        // Direct download for short content
        startDirectDownload(val);
        return;
    }
    
    // Load default settings if available
    loadDefaultSettings();
    
    // Show popup with all options
    showPopup();
    customizePopup(currentPlatform);
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

// Customize popup based on platform
function customizePopup(platform) {
    // Reset all format options visibility
    document.querySelectorAll('.format-option').forEach(option => {
        option.style.display = 'flex';
    });
    
    // Clear platform specific options
    platformSpecificOptions.innerHTML = '';
    
    // Platform specific configurations
    const platformConfigs = {
        youtube: {
            name: 'YouTube',
            icon: 'fab fa-youtube',
            desc: 'Download videos, music, and playlists from YouTube',
            formats: ['video', 'audio', 'playlist'],
            options: [
                { title: 'Download Subtitles', desc: 'Include subtitles in your download' },
                { title: 'Extract Thumbnail', desc: 'Save video thumbnail separately' }
            ]
        },
        instagram: {
            name: 'Instagram',
            icon: 'fab fa-instagram',
            desc: 'Download posts, reels, stories, and IGTV content',
            formats: ['video', 'audio'],
            options: [
                { title: 'Download Without Watermark', desc: 'Remove Instagram watermark from reels' },
                { title: 'Download Profile Picture', desc: 'Save profile picture in HD' }
            ]
        },
        tiktok: {
            name: 'TikTok',
            icon: 'fab fa-tiktok',
            desc: 'Download TikTok videos without watermark',
            formats: ['video', 'audio'],
            options: [
                { title: 'Download Without Watermark', desc: 'Remove TikTok watermark automatically' },
                { title: 'Extract Sound', desc: 'Get the original sound used in the video' }
            ]
        },
        facebook: {
            name: 'Facebook',
            icon: 'fab fa-facebook',
            desc: 'Download videos from Facebook posts and reels',
            formats: ['video', 'audio'],
            options: [
                { title: 'Download HD Quality', desc: 'Get the highest available quality' },
                { title: 'Download Comments', desc: 'Save video comments as text file' }
            ]
        },
        twitter: {
            name: 'Twitter',
            icon: 'fab fa-twitter',
            desc: 'Download videos and GIFs from tweets',
            formats: ['video', 'audio'],
            options: [
                { title: 'Download as GIF', desc: 'Save animated content as GIF' },
                { title: 'Include Tweet Text', desc: 'Save tweet text with the video' }
            ]
        },
        telegram: {
            name: 'Telegram',
            icon: 'fab fa-telegram',
            desc: 'Download files from Telegram channels and chats',
            formats: ['video', 'audio'],
            options: [
                { title: 'Download Channel Files', desc: 'Download entire channel content' },
                { title: 'Extract Metadata', desc: 'Save file information' }
            ]
        },
        terabox: {
            name: 'Terabox',
            icon: 'fas fa-cloud',
            desc: 'Download files from your Terabox cloud storage',
            formats: ['video', 'audio'],
            options: [
                { title: 'Download Folder', desc: 'Download entire folders as ZIP' },
                { title: 'Resume Download', desc: 'Support for paused downloads' }
            ]
        },
        streamnet: {
            name: 'StreamNet',
            icon: 'fas fa-network-wired',
            desc: 'Download videos from StreamNet platform',
            formats: ['video', 'audio'],
            options: [
                { title: 'Download Subtitles', desc: 'Include available subtitles' },
                { title: 'Batch Download', desc: 'Download multiple videos at once' }
            ]
        },
        diskwala: {
            name: 'DiskWala',
            icon: 'fas fa-hdd',
            desc: 'Download files from DiskWala cloud storage',
            formats: ['video', 'audio'],
            options: [
                { title: 'Download Folder', desc: 'Download entire folders' },
                { title: 'Direct Download', desc: 'Get direct download links' }
            ]
        },
        sora: {
            name: 'Sora 2 AI',
            icon: 'fas fa-brain',
            desc: 'Download AI-generated videos and extract prompts',
            formats: ['sora', 'video', 'audio'],
            options: [
                { title: 'Extract AI Prompt', desc: 'Get the text prompt used to generate this video' },
                { title: 'Upscale to 4K', desc: 'Enhance video quality using AI' }
            ]
        },
        unknown: {
            name: 'Unknown Platform',
            icon: 'fas fa-link',
            desc: 'Download media from this website',
            formats: ['video', 'audio'],
            options: [
                { title: 'Auto-detect Media', desc: 'Automatically find downloadable media' },
                { title: 'Browser Mode', desc: 'Use built-in browser to download' }
            ]
        }
    };
    
    const config = platformConfigs[platform] || platformConfigs.unknown;
    
    // Update platform header
    platformIcon.innerHTML = `<i class="${config.icon}"></i>`;
    platformName.textContent = config.name;
    platformDesc.textContent = config.desc;
    
    // Update platform name in default settings section
    platformNameText.textContent = config.name;
    platformNameCheckbox.textContent = config.name;
    
    // Show/hide format options based on platform
    document.querySelectorAll('.format-option').forEach(option => {
        const format = option.getAttribute('data-format');
        if (config.formats.includes(format)) {
            option.style.display = 'flex';
        } else {
            option.style.display = 'none';
        }
    });
    
    // Add platform specific options
    config.options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'platform-option';
        optionDiv.innerHTML = `
            <div>
                <div class="platform-option-title">${option.title}</div>
                <div class="platform-option-desc">${option.desc}</div>
            </div>
            <div class="switch" onclick="this.classList.toggle('checked')"></div>
        `;
        platformSpecificOptions.appendChild(optionDiv);
    });
    
    // Load platform default settings
    if (platformSettings[platform]) {
        selectedFormat = platformSettings[platform].format;
        selectedQuality = platformSettings[platform].quality;
        
        // Update UI to reflect loaded settings
        document.querySelectorAll('.format-option').forEach(el => {
            el.classList.remove('selected');
            if (el.getAttribute('data-format') === selectedFormat) {
                el.classList.add('selected');
            }
        });
        
        document.querySelectorAll('.quality-option').forEach(el => {
            el.classList.remove('selected');
            if (el.getAttribute('onclick').includes(`'${selectedQuality}'`)) {
                el.classList.add('selected');
            }
        });
        
        updateDefaultPreview();
    }
}

// Direct download for short content
function startDirectDownload(url) {
    // Transition Animation
    searchSection.style.marginTop = "20px";
    searchSection.querySelector('h1').style.display = 'none';
    searchSection.querySelector('p').style.display = 'none';
    
    // Show Dashboard
    dashboard.style.display = 'block';
    
    // Mock Metadata
    document.getElementById('mediaTitle').innerText = "Short Content";
    document.getElementById('mediaArtist').innerText = "Direct Download";
    document.getElementById('albumArt').src = `https://source.unsplash.com/random/600x600/?abstract,neon,${Math.random()}`;
    
    // Start download directly
    startDl('Short Content');
    
    // Show notification
    showNotification('Download Started', 'Short content detected. Downloading in best quality...');
}

// Show popup
function showPopup() {
    popupOverlay.classList.add('show');
    
    // Set default selections
    document.querySelectorAll('.format-option').forEach(el => {
        el.classList.remove('selected');
        if (el.getAttribute('data-format') === defaultSettings.format) {
            el.classList.add('selected');
        }
    });
    
    document.querySelectorAll('.quality-option').forEach(el => {
        el.classList.remove('selected');
        if (el.getAttribute('onclick').includes(`'${defaultSettings.quality}'`)) {
            el.classList.add('selected');
        }
    });
    
    // Update default preview
    updateDefaultPreview();
    
    // Show/hide lyrics option based on format
    if (defaultSettings.format === 'audio') {
        popupLyricsOption.style.display = 'flex';
        if (defaultSettings.lyrics) {
            popupLyricsSwitch.classList.add('checked');
        } else {
            popupLyricsSwitch.classList.remove('checked');
        }
    } else {
        popupLyricsOption.style.display = 'none';
    }
}

// Close popup
function closePopup() {
    popupOverlay.classList.remove('show');
}

// Select format
function selectFormat(element, format) {
    document.querySelectorAll('.format-option').forEach(el => {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedFormat = format;
    
    // Show/hide lyrics option based on format
    if (format === 'audio') {
        popupLyricsOption.style.display = 'flex';
    } else {
        popupLyricsOption.style.display = 'none';
    }
    
    updateDefaultPreview();
}

// Select quality
function selectQuality(element, quality) {
    document.querySelectorAll('.quality-option').forEach(el => {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedQuality = quality;
    
    updateDefaultPreview();
}

// Toggle lyrics in popup
function togglePopupLyrics() {
    popupLyricsSwitch.classList.toggle('checked');
    lyricsEnabled = popupLyricsSwitch.classList.contains('checked');
}

// Toggle default settings
function toggleDefaultSettings() {
    setDefaultCheckbox.classList.toggle('checked');
}

// Update default preview
function updateDefaultPreview() {
    const formatMap = {
        'video': 'Video',
        'audio': 'Audio',
        'playlist': 'Playlist',
        'sora': 'Sora 2 AI'
    };
    
    const qualityMap = {
        'highest': 'Highest Quality',
        'high': 'High Quality',
        'medium': 'Medium Quality',
        'low': 'Low Quality'
    };
    
    defaultFormatPreview.textContent = formatMap[selectedFormat] || 'Video';
    defaultQualityPreview.textContent = qualityMap[selectedQuality] || 'High Quality';
}

// Confirm download from popup
function confirmDownload() {
    // Save settings if checkbox is checked
    if (setDefaultCheckbox.classList.contains('checked')) {
        defaultSettings = {
            format: selectedFormat,
            quality: selectedQuality,
            lyrics: lyricsEnabled
        };
        saveDefaultSettings();
        showNotification('Settings Saved', 'Your default download settings have been saved');
    }
    
    // Save platform specific settings
    if (currentPlatform && platformSettings[currentPlatform]) {
        platformSettings[currentPlatform] = {
            format: selectedFormat,
            quality: selectedQuality
        };
        savePlatformSettings();
    }
    
    closePopup();
    
    // Transition Animation
    searchSection.style.marginTop = "20px";
    searchSection.querySelector('h1').style.display = 'none';
    searchSection.querySelector('p').style.display = 'none';
    
    // Show Dashboard
    dashboard.style.display = 'block';
    
    // Mock Metadata
    document.getElementById('mediaTitle').innerText = input.value.includes('http') ? "Detected Link Media" : input.value;
    document.getElementById('mediaArtist').innerText = "Various Artists";
    document.getElementById('albumArt').src = `https://source.unsplash.com/random/600x600/?abstract,neon,${Math.random()}`;
    
    // Set mode based on selection
    setMode(selectedFormat);
    
    // Set lyrics state
    if (selectedFormat === 'audio') {
        lyricsEnabled = popupLyricsSwitch.classList.contains('checked');
        if (lyricsEnabled) {
            lyricsToggle.classList.add('active');
            lyricsStatus.innerText = "Lyrics will be embedded into MP3.";
        } else {
            lyricsToggle.classList.remove('active');
            lyricsStatus.innerText = "Clean Audio Only (No Metadata).";
        }
        updateAudioButton();
    }
    
    // Show notification
    showNotification('Media Found', `Ready to download in ${selectedQuality} quality!`);
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

// Switch between Video / Audio / Playlist / Sora 2 AI / Browser tabs
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Hide all option panels
    videoOpts.style.display = 'none';
    audioOpts.style.display = 'none';
    playlistOpts.style.display = 'none';
    soraOpts.style.display = 'none';
    browserOpts.style.display = 'none';
    
    // Hide all badges
    lyricsTag.style.display = 'none';
    aiTag.style.display = 'none';
    
    if (mode === 'video') {
        document.querySelectorAll('.tab')[0].classList.add('active');
        videoOpts.style.display = 'grid';
        dlBtn.innerText = "SELECT VIDEO QUALITY ABOVE";
        dlBtn.style.background = "var(--gradient-primary)";
    } else if (mode === 'audio') {
        document.querySelectorAll('.tab')[1].classList.add('active');
        audioOpts.style.display = 'block';
        equalizer.style.display = 'block';
        lyricsTag.style.display = 'flex';
        updateAudioButton();
    } else if (mode === 'playlist') {
        document.querySelectorAll('.tab')[2].classList.add('active');
        playlistOpts.style.display = 'block';
        dlBtn.innerText = "DOWNLOAD PLAYLIST";
        dlBtn.style.background = "var(--gradient-funky)";
    } else if (mode === 'sora') {
        document.querySelectorAll('.tab')[3].classList.add('active');
        soraOpts.style.display = 'block';
        dlBtn.innerText = "DOWNLOAD SORA 2 AI VIDEO";
        dlBtn.style.background = "var(--gradient-sora)";
        dlBtn.classList.add('sora-btn');
        aiTag.style.display = 'flex';
    } else if (mode === 'browser') {
        document.querySelectorAll('.tab')[4].classList.add('active');
        browserOpts.style.display = 'flex';
        dlBtn.style.display = 'none'; // Hide the main download button in browser mode
    }
}

// Toggle Lyrics Switch
function toggleLyrics() {
    lyricsEnabled = !lyricsEnabled;
    
    if(lyricsEnabled) {
        lyricsToggle.classList.add('active');
        lyricsStatus.innerText = "Lyrics will be embedded into MP3.";
    } else {
        lyricsToggle.classList.remove('active');
        lyricsStatus.innerText = "Clean Audio Only (No Metadata).";
    }
    updateAudioButton();
}

// Update Button Text based on Lyrics State
function updateAudioButton() {
    if(lyricsEnabled) {
        dlBtn.innerText = "DOWNLOAD MP3 + LYRICS";
        dlBtn.style.background = "var(--gradient-lyrics)";
    } else {
        dlBtn.innerText = "DOWNLOAD AUDIO ONLY";
        dlBtn.style.background = "var(--gradient-primary)";
    }
}

// Extract Sora 2 AI Prompt
function extractPrompt() {
    aiParsing.classList.add('show');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 100) progress = 100;
        
        aiParsingFill.style.width = progress + "%";
        
        // Dynamic Status Text
        if(progress < 30) aiParsingStatus.innerText = "Analyzing video frames...";
        else if (progress < 60) aiParsingStatus.innerText = "Detecting AI patterns...";
        else if (progress < 90) aiParsingStatus.innerText = "Reconstructing prompt...";
        else {
            aiParsingStatus.innerText = "Prompt extracted successfully!";
        }

        if(progress === 100) {
            clearInterval(interval);
            
            setTimeout(() => {
                aiParsing.classList.remove('show');
                
                // Show the extracted prompt
                const prompt = "A majestic lion walking through a field of wildflowers at sunset, photorealistic, 8K, cinematic lighting";
                
                // Create a modal to show the prompt
                const promptModal = document.createElement('div');
                promptModal.className = 'popup-overlay show';
                promptModal.innerHTML = `
                    <div class="popup">
                        <div class="popup-header">
                            <div class="popup-title">Extracted AI Prompt</div>
                            <button class="popup-close" onclick="this.closest('.popup-overlay').remove()">×</button>
                        </div>
                        <div class="popup-content">
                            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                                <p style="font-family: monospace; line-height: 1.5;">${prompt}</p>
                            </div>
                            <div class="popup-actions">
                                <button class="popup-btn popup-btn-cancel" onclick="this.closest('.popup-overlay').remove()">Close</button>
                                <button class="popup-btn popup-btn-download" onclick="copyPrompt('${prompt}')">Copy Prompt</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(promptModal);
            }, 500);
        }
    }, 150);
}

// Copy prompt to clipboard
function copyPrompt(prompt) {
    navigator.clipboard.writeText(prompt).then(() => {
        showNotification('Prompt Copied', 'AI prompt copied to clipboard');
    });
}

// Simulate Download
function startDl(specificFormat) {
    let formatName = specificFormat === 'Default' ? (currentMode === 'video' ? '1080p' : 'MP3') : specificFormat;
    
    // Update download count
    const count = parseInt(downloadCount.innerText.replace(/[^0-9]/g, '')) + 1;
    downloadCount.innerText = `${count.toLocaleString()} Downloads Today`;
    
    // Progress UI
    const pArea = document.getElementById('progress');
    const pFill = document.getElementById('barFill');
    const pText = document.getElementById('pText');
    const pPercent = document.getElementById('pPercent');
    
    pArea.style.display = 'block';
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 8;
        if (progress > 100) progress = 100;
        
        pFill.style.width = progress + "%";
        pPercent.innerText = Math.floor(progress) + "%";
        
        // Dynamic Status Text
        if(progress < 30) pText.innerText = "Handshaking...";
        else if (progress < 60) pText.innerText = "Downloading Stream...";
        else if (progress < 90) {
            if(currentMode === 'audio' && lyricsEnabled) pText.innerText = "Embedding Lyrics & Cover Art...";
            else if(currentMode === 'playlist') pText.innerText = "Processing Playlist Items...";
            else if(currentMode === 'sora') pText.innerText = "Processing AI Video...";
            else pText.innerText = "Finalizing Conversion...";
        } else {
            pText.innerText = "Saving File...";
        }

        if(progress === 100) {
            clearInterval(interval);
            pText.innerText = "Completed!";
            pText.style.color = "#4ade80"; // Success Green
            
            // Show success notification
            showNotification('Download Complete', `${formatName} downloaded successfully!`);
            
            setTimeout(() => {
                alert(`${formatName} Downloaded!\nLyrics: ${lyricsEnabled && currentMode === 'audio' ? 'Included' : 'None'}\nAI: ${currentMode === 'sora' ? 'Yes' : 'No'}`);
                pArea.style.display = 'none';
            }, 500);
        }
    }, 150);
}

// Browser functions
function browserGo() {
    const url = browserUrl.value.trim();
    if (!url) return;
    
    // Add to history
    if (browserHistoryIndex < browserHistory.length - 1) {
        browserHistory = browserHistory.slice(0, browserHistoryIndex + 1);
    }
    browserHistory.push(url);
    browserHistoryIndex = browserHistory.length - 1;
    
    // Update placeholder
    browserPlaceholder.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <h3>Loading...</h3>
        <p>Please wait while we load the page</p>
    `;
    
    // Simulate loading
    setTimeout(() => {
        browserPlaceholder.innerHTML = `
            <i class="fas fa-check-circle" style="color: #4ade80;"></i>
            <h3>Page Loaded</h3>
            <p>Successfully loaded: ${url.substring(0, 30)}${url.length > 30 ? "..." : ""}</p>
            <button class="browser-download-btn" onclick="browserDownload()">
                <i class="fas fa-download"></i> Download Media from Current Page
            </button>
        `;
    }, 1500);
}

function browserBack() {
    if (browserHistoryIndex > 0) {
        browserHistoryIndex--;
        browserUrl.value = browserHistory[browserHistoryIndex];
        browserGo();
    }
}

function browserForward() {
    if (browserHistoryIndex < browserHistory.length - 1) {
        browserHistoryIndex++;
        browserUrl.value = browserHistory[browserHistoryIndex];
        browserGo();
    }
}

function browserRefresh() {
    browserGo();
}

function browserDownload() {
    const url = browserUrl.value.trim();
    if (!url) {
        showNotification('Error', 'Please enter a URL first');
        return;
    }
    
    // Show dashboard if not already visible
    if (dashboard.style.display === 'none') {
        searchSection.style.marginTop = "20px";
        searchSection.querySelector('h1').style.display = 'none';
        searchSection.querySelector('p').style.display = 'none';
        dashboard.style.display = 'block';
    }
    
    // Mock Metadata
    document.getElementById('mediaTitle').innerText = "Browser Media";
    document.getElementById('mediaArtist').innerText = "From: " + url.substring(0, 30) + (url.length > 30 ? "..." : "");
    document.getElementById('albumArt').src = `https://source.unsplash.com/random/600x600/?abstract,neon,${Math.random()}`;
    
    // Switch to video mode
    setMode('video');
    
    // Show notification
    showNotification('Media Found', 'Ready to download from browser!');
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

browserUrl.addEventListener('keypress', (e) => { 
    if(e.key === 'Enter') browserGo(); 
});

// Close menu on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-btn') && !e.target.closest('.dropdown-menu') && !e.target.closest('.instagram-btn')) {
        menu.classList.remove('show');
    }
    
    if (!e.target.closest('.lang-toggle') && !e.target.closest('.lang-dropdown')) {
        langDropdown.classList.remove('show');
    }
});

// Add some interactive effects
document.querySelectorAll('.dl-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Animate equalizer bars on hover
document.querySelectorAll('.eq-bar').forEach(bar => {
    bar.addEventListener('mouseenter', function() {
        const fill = this.querySelector('.eq-fill');
        const randomHeight = Math.floor(Math.random() * 70) + 30;
        fill.style.height = `${randomHeight}%`;
    });
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
    
    // Check for shared URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');
    
    if (sharedUrl) {
        input.value = sharedUrl;
        processInput();
    }
});

// Logo and favicon prompts
console.log("=== LOGO PROMPT ===");
console.log("Create a modern, sleek logo for 'ALLIO PRO', a global media downloader. The logo should feature a lightning bolt icon integrated with a download arrow. Use a gradient of purple and blue colors. The design should be minimalist and suitable for both dark and light backgrounds. The logo should be in vector format and scalable.");

console.log("=== FAVICON PROMPT ===");
console.log("Design a 16x16 and 32x32 pixel favicon for 'ALLIO PRO'. The favicon should be a simplified version of the logo, featuring a lightning bolt. Use the same purple and blue gradient. The design must be clear and recognizable even at small sizes.");
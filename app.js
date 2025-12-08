// SA:MP Music Streamer - Fixed Working Version
let allSongs = [];
const UPLOAD_PASSWORD = 'ridingisFun123!';

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('TWS Music Streamer loading...');
    
    // Initialize everything
    initializeApp();
    
    console.log('TWS Music Streamer ready!');
});

function initializeApp() {
    // Load saved data
    loadDisplayName();
    loadSongsFromStorage();
    updateSongCount();
    updateUserInfo();
    
    // Setup all event listeners
    setupEventListeners();
    
    // Show home tab by default
    showTab('home');
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                showTab(tabName);
            }
        });
    });
    
    // File upload
    const fileInput = document.getElementById('mp3File');
    if (fileInput) {
        fileInput.addEventListener('change', showFileInfo);
    }
    
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchSongs);
    }
    
    // Settings button
    const settingsBtn = document.querySelector('[onclick*="saveSettings"]');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', saveSettings);
    }
    
    // Upload button
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadSong);
    }
}

// ==================== TAB NAVIGATION ====================
function showTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate corresponding button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Special handling for library tab
    if (tabName === 'library') {
        renderSongList();
    }
}

// ==================== SETTINGS ====================
function loadDisplayName() {
    const savedName = localStorage.getItem('tws_displayName');
    if (savedName) {
        document.getElementById('displayName').value = savedName;
    }
}

function saveSettings() {
    const displayName = document.getElementById('displayName').value.trim() || 'Anonymous';
    
    // Save to localStorage
    localStorage.setItem('tws_displayName', displayName);
    
    // Update UI
    updateUserInfo();
    
    // Show success message
    const statusEl = document.getElementById('settingsStatus');
    if (statusEl) {
        statusEl.textContent = `✅ Settings saved! You will appear as: ${displayName}`;
        statusEl.className = 'status-box';
        statusEl.style.display = 'block';
        
        // Hide message after 3 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}

function updateUserInfo() {
    const displayName = localStorage.getItem('tws_displayName') || 'Guest';
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) {
        userInfoEl.textContent = `👤 ${displayName}`;
    }
}

// ==================== FILE UPLOAD ====================
function showFileInfo() {
    const fileInput = document.getElementById('mp3File');
    const fileInfoEl = document.getElementById('fileInfo');
    
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        fileInfoEl.innerHTML = `
            <strong>Selected file:</strong> ${file.name}<br>
            <strong>Size:</strong> ${fileSize} MB<br>
            <strong>Type:</strong> ${file.type || 'MP3 audio'}
        `;
    } else if (fileInfoEl) {
        fileInfoEl.innerHTML = 'No file selected';
    }
}

async function uploadSong() {
    // Get form values
    const shortName = document.getElementById('shortName')?.value.trim();
    const fileInput = document.getElementById('mp3File');
    const password = document.getElementById('uploadPassword')?.value;
    const displayName = localStorage.getItem('tws_displayName') || 'Anonymous';
    
    // Validation
    if (!shortName) {
        showUploadStatus('❌ Please enter a short name for the song', 'error');
        return;
    }
    
    if (!fileInput || !fileInput.files[0]) {
        showUploadStatus('❌ Please select an MP3 file', 'error');
        return;
    }
    
    if (password !== UPLOAD_PASSWORD) {
        showUploadStatus('❌ Incorrect upload password', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Validate file type
    if (!file.type.includes('audio/mpeg') && !file.name.toLowerCase().endsWith('.mp3')) {
        showUploadStatus('❌ Only MP3 files are allowed', 'error');
        return;
    }
    
    // Validate file size
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        showUploadStatus(`❌ File too large. Max size: 100MB (Your file: ${(file.size/1024/1024).toFixed(2)}MB)`, 'error');
        return;
    }
    
    // Disable upload button and show spinner
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadText = document.getElementById('uploadText');
    const uploadSpinner = document.getElementById('uploadSpinner');
    
    if (uploadBtn) uploadBtn.disabled = true;
    if (uploadText) uploadText.textContent = 'Uploading...';
    if (uploadSpinner) uploadSpinner.style.display = 'block';
    
    try {
        // Show upload status
        showUploadStatus('📤 Processing your file...');
        
        // Simulate upload (for now - will be replaced with real Internet Archive upload)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // For now, create a simulated URL
        // TODO: Replace with actual Internet Archive upload
        const simulatedUrl = `https://archive.org/download/tws-music-${shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/${shortName}.mp3`;
        
        // Create song object
        const songData = {
            id: Date.now().toString(),
            shortName: shortName,
            fileName: file.name,
            fileSize: file.size,
            fileUrl: simulatedUrl,
            uploadedBy: displayName,
            uploadDate: new Date().toISOString(),
            playCount: 0
        };
        
        // Save to local storage
        saveSongToStorage(songData);
        
        // Show success modal
        showSuccessModal(songData.fileUrl);
        
        // Clear form
        if (document.getElementById('shortName')) document.getElementById('shortName').value = '';
        if (fileInput) fileInput.value = '';
        if (document.getElementById('uploadPassword')) document.getElementById('uploadPassword').value = '';
        if (document.getElementById('fileInfo')) document.getElementById('fileInfo').innerHTML = '';
        
        // Update library
        renderSongList();
        
        // Show success message
        showUploadStatus('✅ Upload successful!', 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus(`❌ Upload failed: ${error.message}`, 'error');
    } finally {
        // Re-enable upload button
        if (uploadBtn) uploadBtn.disabled = false;
        if (uploadText) uploadText.textContent = 'Upload Song';
        if (uploadSpinner) uploadSpinner.style.display = 'none';
    }
}

function showUploadStatus(message, type = 'info') {
    const statusEl = document.getElementById('uploadStatus');
    if (!statusEl) return;
    
    statusEl.innerHTML = message;
    statusEl.className = 'status-box';
    
    if (type === 'error') {
        statusEl.classList.add('error');
    }
    
    statusEl.style.display = 'block';
    
    // Auto-hide info messages after 5 seconds
    if (type === 'info') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// ==================== LIBRARY MANAGEMENT ====================
function loadSongsFromStorage() {
    const savedSongs = localStorage.getItem('tws_songs');
    if (savedSongs) {
        allSongs = JSON.parse(savedSongs);
    } else {
        allSongs = [];
    }
}

function saveSongToStorage(song) {
    allSongs.unshift(song);
    localStorage.setItem('tws_songs', JSON.stringify(allSongs));
    updateSongCount();
}

function renderSongList() {
    const songListEl = document.getElementById('songList');
    if (!songListEl) return;
    
    if (allSongs.length === 0) {
        songListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>No songs uploaded yet</h3>
                <p>Be the first to upload a song!</p>
                <button class="secondary-btn" onclick="showTab('upload')">Upload First Song</button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    allSongs.forEach(song => {
        const fileSizeMB = (song.fileSize / 1024 / 1024).toFixed(2);
        const uploadDate = new Date(song.uploadDate).toLocaleDateString();
        
        html += `
            <div class="song-item" data-song-id="${song.id}">
                <div class="song-header">
                    <div class="song-title">${song.shortName}</div>
                    <div class="song-actions">
                        <button class="secondary-btn" onclick="copyUrl('${song.fileUrl}')">Copy URL</button>
                        <button class="secondary-btn" onclick="deleteSong('${song.id}')">Delete</button>
                    </div>
                </div>
                <div class="song-meta">
                    Uploaded by: <strong>${song.uploadedBy}</strong> • 
                    Date: ${uploadDate} • 
                    Size: ${fileSizeMB} MB
                </div>
                <div class="url-display">
                    ${song.fileUrl}
                </div>
            </div>
        `;
    });
    
    songListEl.innerHTML = html;
}

function searchSongs() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const songItems = document.querySelectorAll('.song-item');
    
    songItems.forEach(item => {
        const songText = item.textContent.toLowerCase();
        if (songText.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function updateSongCount() {
    const countEl = document.getElementById('songCount');
    if (countEl) {
        countEl.textContent = allSongs.length;
    }
}

function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('✅ URL copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('❌ Failed to copy URL. Please copy manually.');
    });
}

function deleteSong(songId) {
    if (confirm('Are you sure you want to delete this song from your library?')) {
        allSongs = allSongs.filter(song => song.id !== songId);
        localStorage.setItem('tws_songs', JSON.stringify(allSongs));
        renderSongList();
        updateSongCount();
    }
}

// ==================== MODAL FUNCTIONS ====================
function showSuccessModal(url) {
    const modal = document.getElementById('successModal');
    const urlDisplay = document.getElementById('successUrl');
    
    if (modal && urlDisplay) {
        urlDisplay.textContent = url;
        modal.style.display = 'flex';
    }
}

function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function copySuccessUrl() {
    const urlDisplay = document.getElementById('successUrl');
    if (urlDisplay) {
        copyUrl(urlDisplay.textContent);
        closeModal();
    }
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', function(e) {
    // Escape to close modal
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Make functions globally available
window.showTab = showTab;
window.saveSettings = saveSettings;
window.uploadSong = uploadSong;
window.copyUrl = copyUrl;
window.deleteSong = deleteSong;
window.showSuccessModal = showSuccessModal;
window.closeModal = closeModal;
window.copySuccessUrl = copySuccessUrl;
window.searchSongs = searchSongs;

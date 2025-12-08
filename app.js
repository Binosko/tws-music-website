// =============================================
// SA:MP Music Streamer - Main Application
// =============================================

// Global variables
let allSongs = [];
const UPLOAD_PASSWORD = 'ridingisFun123!';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app
    loadDisplayName();
    loadSongsFromStorage();
    updateSongCount();
    updateUserInfo();
    
    // Set default tab to home
    showTab('home');
    
    // Add event listeners
    document.getElementById('mp3File').addEventListener('change', showFileInfo);
    document.getElementById('searchInput').addEventListener('input', searchSongs);
    
    console.log('SA:MP Music Streamer initialized');
});

// =============================================
// TAB NAVIGATION
// =============================================

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate corresponding tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent.includes(getTabName(tabName))) {
            btn.classList.add('active');
        }
    });
    
    // Special handling for library tab
    if (tabName === 'library') {
        renderSongList();
    }
}

function getTabName(tabId) {
    const tabNames = {
        'home': 'Home',
        'upload': 'Upload',
        'library': 'Library',
        'settings': 'Settings'
    };
    return tabNames[tabId] || tabId;
}

// =============================================
// SETTINGS MANAGEMENT
// =============================================

function loadDisplayName() {
    const savedName = localStorage.getItem('samp_displayName');
    if (savedName) {
        document.getElementById('displayName').value = savedName;
    }
}

function saveSettings() {
    const displayName = document.getElementById('displayName').value.trim() || 'Anonymous';
    
    // Save to localStorage
    localStorage.setItem('samp_displayName', displayName);
    
    // Update UI
    updateUserInfo();
    
    // Show success message
    const statusEl = document.getElementById('settingsStatus');
    statusEl.textContent = `✅ Settings saved! You will appear as: ${displayName}`;
    statusEl.className = 'status-box';
    statusEl.style.display = 'block';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}

function updateUserInfo() {
    const displayName = localStorage.getItem('samp_displayName') || 'Guest';
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) {
        userInfoEl.textContent = `👤 ${displayName}`;
    }
}

// =============================================
// FILE UPLOAD HANDLING
// =============================================

function showFileInfo() {
    const fileInput = document.getElementById('mp3File');
    const fileInfoEl = document.getElementById('fileInfo');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
        fileInfoEl.innerHTML = `
            <strong>Selected file:</strong> ${file.name}<br>
            <strong>Size:</strong> ${fileSize} MB<br>
            <strong>Type:</strong> ${file.type || 'MP3 audio'}
        `;
    } else {
        fileInfoEl.innerHTML = 'No file selected';
    }
}

async function uploadSong() {
    // Get form values
    const shortName = document.getElementById('shortName').value.trim();
    const fileInput = document.getElementById('mp3File');
    const password = document.getElementById('uploadPassword').value;
    const displayName = localStorage.getItem('samp_displayName') || 'Anonymous';
    
    // Validation
    if (!shortName) {
        showUploadStatus('❌ Please enter a short name for the song', 'error');
        return;
    }
    
    if (!fileInput.files[0]) {
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
    if (file.size > MAX_FILE_SIZE) {
        showUploadStatus(`❌ File too large. Max size: 100MB (Your file: ${(file.size/1024/1024).toFixed(2)}MB)`, 'error');
        return;
    }
    
    // Disable upload button and show spinner
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadText = document.getElementById('uploadText');
    const uploadSpinner = document.getElementById('uploadSpinner');
    
    uploadBtn.disabled = true;
    uploadText.textContent = 'Uploading...';
    uploadSpinner.style.display = 'block';
    
    try {
        // Show upload status
        showUploadStatus('📤 Processing your file...');
        
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create a local URL for the file
        const localUrl = URL.createObjectURL(file);
        
        // Create song object
        const songData = {
            id: Date.now().toString(),
            shortName: shortName,
            fileName: file.name,
            fileSize: file.size,
            fileUrl: localUrl,
            uploadedBy: displayName,
            uploadDate: new Date().toISOString(),
            playCount: 0
        };
        
        // Save to local storage
        saveSongToStorage(songData);
        
        // Show success modal
        showSuccessModal(songData.fileUrl);
        
        // Clear form
        document.getElementById('shortName').value = '';
        document.getElementById('mp3File').value = '';
        document.getElementById('uploadPassword').value = '';
        document.getElementById('fileInfo').innerHTML = '';
        
        // Update library
        renderSongList();
        
        // Show success message
        showUploadStatus('✅ Upload successful! URL generated below.', 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus(`❌ Upload failed: ${error.message}`, 'error');
    } finally {
        // Re-enable upload button
        uploadBtn.disabled = false;
        uploadText.textContent = 'Upload Song';
        uploadSpinner.style.display = 'none';
    }
}

function showUploadStatus(message, type = 'info') {
    const statusEl = document.getElementById('uploadStatus');
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

// =============================================
// LIBRARY MANAGEMENT
// =============================================

function loadSongsFromStorage() {
    const savedSongs = localStorage.getItem('samp_songs');
    if (savedSongs) {
        allSongs = JSON.parse(savedSongs);
    } else {
        allSongs = [];
    }
}

function saveSongToStorage(song) {
    allSongs.unshift(song); // Add to beginning
    localStorage.setItem('samp_songs', JSON.stringify(allSongs));
    updateSongCount();
}

function renderSongList() {
    const songListEl = document.getElementById('songList');
    
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
                    Size: ${fileSizeMB} MB • 
                    Plays: ${song.playCount}
                </div>
                <div class="url-display">
                    ${song.fileUrl}
                </div>
                <div class="song-help">
                    <small>Use in SA:MP: <code>/stream ${song.fileUrl}</code></small>
                </div>
            </div>
        `;
    });
    
    songListEl.innerHTML = html;
}

function searchSongs() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
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
        alert('✅ URL copied to clipboard!\n\nUse in SA:MP:\n/stream ' + url);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('❌ Failed to copy URL. Please copy manually.');
    });
}

function deleteSong(songId) {
    if (confirm('Are you sure you want to delete this song from your library?')) {
        allSongs = allSongs.filter(song => song.id !== songId);
        localStorage.setItem('samp_songs', JSON.stringify(allSongs));
        renderSongList();
        updateSongCount();
    }
}

function clearLibrary() {
    if (confirm('Clear all songs from your library?')) {
        allSongs = [];
        localStorage.removeItem('samp_songs');
        renderSongList();
        updateSongCount();
        alert('Library cleared.');
    }
}

// =============================================
// MODAL FUNCTIONS
// =============================================

function showSuccessModal(url) {
    document.getElementById('successUrl').textContent = url;
    document.getElementById('successModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('successModal').style.display = 'none';
}

function copySuccessUrl() {
    const url = document.getElementById('successUrl').textContent;
    copyUrl(url);
    closeModal();
}

// =============================================
// KEYBOARD SHORTCUTS
// =============================================

document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Number shortcuts for tabs
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                showTab('home');
                break;
            case '2':
                e.preventDefault();
                showTab('upload');
                break;
            case '3':
                e.preventDefault();
                showTab('library');
                break;
            case '4':
                e.preventDefault();
                showTab('settings');
                break;
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        closeModal();
    }
});

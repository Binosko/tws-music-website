// SA:MP Music Streamer - Clean Working Version
let allSongs = [];
const UPLOAD_PASSWORD = 'ridingisFun123!';

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('TWS Music Streamer loading...');
    
    // Initialize everything
    loadDisplayName();
    loadSongsFromStorage();
    updateSongCount();
    updateUserInfo();
    
    // Setup event listeners
    setupEventListeners();
    
    // Show home tab by default
    showTab('home');
    
    console.log('TWS Music Streamer ready!');
});

function setupEventListeners() {
    // File upload listener
    const fileInput = document.getElementById('mp3File');
    if (fileInput) {
        fileInput.addEventListener('change', showFileInfo);
    }
    
    // Search listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchSongs);
    }
}

// ==================== TAB NAVIGATION ====================
function showTab(tabName) {
    console.log('Showing tab:', tabName);
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tab = document.getElementById(tabName);
    if (tab) {
        tab.classList.add('active');
    }
    
    // Activate clicked button
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tabName) || btn.getAttribute('onclick')?.includes(tabName)) {
            btn.classList.add('active');
        }
    });
    
    // Update library if needed
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

// ==================== SETTINGS ====================
function loadDisplayName() {
    const savedName = localStorage.getItem('tws_displayName');
    if (savedName) {
        document.getElementById('displayName').value = savedName;
    }
}

// ADD THIS FUNCTION - IT'S MISSING!
function updateUserInfo() {
    const displayName = localStorage.getItem('tws_displayName') || 'Guest';
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) {
        userInfoEl.textContent = `👤 ${displayName}`;
    }
}

function saveSettings() {
    const displayName = document.getElementById('displayName')?.value.trim() || 'Anonymous';
    localStorage.setItem('tws_displayName', displayName);
    
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = `👤 ${displayName}`;
    
    const status = document.getElementById('settingsStatus');
    if (status) {
        status.innerHTML = `✅ Settings saved!`;
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 3000);
    }
}

function saveSettings() {
    const displayName = document.getElementById('displayName')?.value.trim() || 'Anonymous';
    localStorage.setItem('tws_displayName', displayName);
    
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = `👤 ${displayName}`;
    
    const status = document.getElementById('settingsStatus');
    if (status) {
        status.innerHTML = `✅ Settings saved!`;
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 3000);
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
            <strong>Size:</strong> ${fileSize} MB
        `;
    } else if (fileInfoEl) {
        fileInfoEl.innerHTML = 'No file selected';
    }
}

async function uploadSong() {
    console.log('uploadSong() called');
    
    const shortName = document.getElementById('shortName')?.value.trim();
    const fileInput = document.getElementById('mp3File');
    const password = document.getElementById('uploadPassword')?.value;
    const displayName = localStorage.getItem('tws_displayName') || 'Anonymous';
    
    console.log('Form data:', { shortName, password, displayName });
    
    // Validation
    if (!shortName) {
        showUploadStatus('❌ Please enter a short name', 'error');
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
    console.log('File selected:', file.name, file.size, 'bytes');
    
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
    
    // Disable upload button
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadText = document.getElementById('uploadText');
    const uploadSpinner = document.getElementById('uploadSpinner');
    
    if (uploadBtn) uploadBtn.disabled = true;
    if (uploadText) uploadText.textContent = 'Uploading...';
    if (uploadSpinner) uploadSpinner.style.display = 'block';
    
    showUploadStatus('📤 Starting upload process...');
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('shortName', shortName);
        formData.append('password', password);
        formData.append('displayName', displayName);
        formData.append('file', file);
        
        console.log('Sending to /api/upload...');
        
        // Send to backend
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        
        const result = await response.json();
        console.log('Response result:', result);
        
        if (!response.ok) {
            throw new Error(result.error || `Upload failed with status ${response.status}`);
        }
        
        // SUCCESS!
        const archiveUrl = result.url;
        console.log('Upload successful! URL:', archiveUrl);
        
        // Create song object
        const songData = {
            id: Date.now().toString(),
            shortName: shortName,
            fileName: file.name,
            fileSize: file.size,
            fileUrl: archiveUrl,
            uploadedBy: displayName,
            uploadDate: new Date().toISOString(),
            playCount: 0
        };
        
        // Save to local storage
        saveSongToStorage(songData);
        
        // Show success
        showSuccessModal(archiveUrl);
        
        // Clear form
        document.getElementById('shortName').value = '';
        fileInput.value = '';
        document.getElementById('uploadPassword').value = '';
        document.getElementById('fileInfo').innerHTML = '';
        
        // Update library
        renderSongList();
        
        showUploadStatus('✅ Upload successful!', 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        
        let errorMsg = `❌ Upload failed: ${error.message}`;
        
        // Add helpful hints
        if (error.message.includes('credentials') || error.message.includes('Access Denied')) {
            errorMsg += '<br><br>⚠️ Internet Archive API keys issue.<br>';
            errorMsg += 'Check Vercel Environment Variables: IA_ACCESS_KEY and IA_SECRET_KEY';
        } else if (error.message.includes('fetch') || error.message.includes('Network')) {
            errorMsg += '<br><br>⚠️ Cannot reach backend API.<br>';
            errorMsg += 'Check if /api/upload.js exists on server.';
        }
        
        showUploadStatus(errorMsg, 'error');
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
    
    // Auto-hide info messages
    if (type === 'info') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// ==================== LIBRARY ====================
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
            <div class="song-item">
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
                <div class="url-display">${song.fileUrl}</div>
            </div>
        `;
    });
    
    songListEl.innerHTML = html;
}

function searchSongs() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const songItems = document.querySelectorAll('.song-item');
    
    songItems.forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(searchTerm) ? 'block' : 'none';
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
        alert('❌ Failed to copy. Please copy manually.');
    });
}

function deleteSong(songId) {
    if (confirm('Delete this song from library?')) {
        allSongs = allSongs.filter(song => song.id !== songId);
        localStorage.setItem('tws_songs', JSON.stringify(allSongs));
        renderSongList();
        updateSongCount();
    }
}

// ==================== MODAL ====================
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

// ==================== MAKE FUNCTIONS GLOBAL ====================
// This is CRITICAL for onclick attributes to work!
window.showTab = showTab;
window.saveSettings = saveSettings;
window.uploadSong = uploadSong;
window.copyUrl = copyUrl;
window.showSuccessModal = showSuccessModal;
window.closeModal = closeModal;
window.copySuccessUrl = copySuccessUrl;
window.searchSongs = searchSongs;
window.deleteSong = deleteSong;

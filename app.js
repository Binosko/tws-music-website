// SA:MP Music Streamer
let allSongs = [];
const UPLOAD_PASSWORD = 'ridingisFun123!'; // You'll share this privately

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadDisplayName();
    loadSongsFromStorage();
    updateSongCount();
    updateUserInfo();
    showTab('home');
});

// Tab Navigation
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.textContent.includes(getTabName(tabName))) {
            btn.classList.add('active');
        }
    });
    
    if (tabName === 'library') renderSongList();
}

function getTabName(tabId) {
    return tabId.charAt(0).toUpperCase() + tabId.slice(1);
}

// Settings
function loadDisplayName() {
    const savedName = localStorage.getItem('samp_displayName');
    if (savedName) document.getElementById('displayName').value = savedName;
}

function saveSettings() {
    const displayName = document.getElementById('displayName').value.trim() || 'Anonymous';
    localStorage.setItem('samp_displayName', displayName);
    updateUserInfo();
    
    const statusEl = document.getElementById('settingsStatus');
    statusEl.textContent = `✅ Settings saved! You will appear as: ${displayName}`;
    statusEl.className = 'status-box';
    statusEl.style.display = 'block';
    setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
}

function updateUserInfo() {
    const displayName = localStorage.getItem('samp_displayName') || 'Guest';
    document.getElementById('userInfo').textContent = `👤 ${displayName}`;
}

// File Upload
function showFileInfo() {
    const fileInput = document.getElementById('mp3File');
    const fileInfoEl = document.getElementById('fileInfo');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        fileInfoEl.innerHTML = `
            <strong>Selected file:</strong> ${file.name}<br>
            <strong>Size:</strong> ${fileSize} MB
        `;
    } else {
        fileInfoEl.innerHTML = 'No file selected';
    }
}

async function uploadSong() {
    const shortName = document.getElementById('shortName').value.trim();
    const fileInput = document.getElementById('mp3File');
    const password = document.getElementById('uploadPassword').value;
    const displayName = localStorage.getItem('samp_displayName') || 'Anonymous';
    
    // Validation
    if (!shortName) return showUploadStatus('❌ Please enter a short name', 'error');
    if (!fileInput.files[0]) return showUploadStatus('❌ Please select an MP3 file', 'error');
    if (password !== UPLOAD_PASSWORD) return showUploadStatus('❌ Incorrect upload password', 'error');
    
    const file = fileInput.files[0];
    if (file.size > 100 * 1024 * 1024) return showUploadStatus('❌ File too large (max 100MB)', 'error');
    if (!file.type.includes('audio/mpeg') && !file.name.toLowerCase().endsWith('.mp3')) {
        return showUploadStatus('❌ Only MP3 files allowed', 'error');
    }
    
    // Show loading
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadText = document.getElementById('uploadText');
    const uploadSpinner = document.getElementById('uploadSpinner');
    uploadBtn.disabled = true;
    uploadText.textContent = 'Uploading...';
    uploadSpinner.style.display = 'block';
    showUploadStatus('📤 Processing your file...');
    
    try {
        // Simulate upload (for now - we'll add real storage later)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create song object (temporary - will be replaced with real storage)
        const songData = {
            id: Date.now().toString(),
            shortName: shortName,
            fileName: file.name,
            fileSize: file.size,
            // TEMPORARY: Simulated URL - will be real Internet Archive/GitHub URL later
            fileUrl: `https://storage.samp-music.com/${shortName}.mp3`,
            uploadedBy: displayName,
            uploadDate: new Date().toISOString(),
            playCount: 0
        };
        
        // Save to local storage (temporary)
        saveSongToStorage(songData);
        
        // Show success
        showSuccessModal(songData.fileUrl);
        
        // Clear form
        document.getElementById('shortName').value = '';
        document.getElementById('mp3File').value = '';
        document.getElementById('uploadPassword').value = '';
        document.getElementById('fileInfo').innerHTML = '';
        
        // Update library
        renderSongList();
        
        showUploadStatus('✅ Upload successful!', 'success');
        
    } catch (error) {
        showUploadStatus(`❌ Error: ${error.message}`, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadText.textContent = 'Upload Song';
        uploadSpinner.style.display = 'none';
    }
}

function showUploadStatus(message, type = 'info') {
    const statusEl = document.getElementById('uploadStatus');
    statusEl.innerHTML = message;
    statusEl.className = 'status-box ' + (type === 'error' ? 'error' : '');
    statusEl.style.display = 'block';
    if (type === 'info') setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
}

// Library Functions
function loadSongsFromStorage() {
    const savedSongs = localStorage.getItem('samp_songs');
    allSongs = savedSongs ? JSON.parse(savedSongs) : [];
}

function saveSongToStorage(song) {
    allSongs.unshift(song);
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
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.song-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(searchTerm) ? 'block' : 'none';
    });
}

function updateSongCount() {
    document.getElementById('songCount').textContent = allSongs.length;
}

function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('✅ URL copied to clipboard!');
    });
}

function deleteSong(songId) {
    if (confirm('Delete this song from library?')) {
        allSongs = allSongs.filter(song => song.id !== songId);
        localStorage.setItem('samp_songs', JSON.stringify(allSongs));
        renderSongList();
        updateSongCount();
    }
}

// Modal Functions
function showSuccessModal(url) {
    document.getElementById('successUrl').textContent = url;
    document.getElementById('successModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('successModal').style.display = 'none';
}

function copySuccessUrl() {
    copyUrl(document.getElementById('successUrl').textContent);
    closeModal();
}

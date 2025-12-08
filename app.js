async function uploadSong() {
    const shortName = document.getElementById('shortName')?.value.trim();
    const fileInput = document.getElementById('mp3File');
    const password = document.getElementById('uploadPassword')?.value;
    const displayName = localStorage.getItem('tws_displayName') || 'Anonymous';
    
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
    if (uploadText) uploadText.textContent = 'Uploading to Internet Archive...';
    if (uploadSpinner) uploadSpinner.style.display = 'block';
    showUploadStatus('📤 Connecting to Internet Archive...');
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('shortName', shortName);
        formData.append('password', password);
        formData.append('displayName', displayName);
        formData.append('file', file);
        
        // Send to our backend
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Upload failed');
        }
        
        // SUCCESS - Real Internet Archive URL!
        const archiveUrl = result.url;
        
        // Create song object
        const songData = {
            id: Date.now().toString(),
            shortName: shortName,
            fileName: file.name,
            fileSize: file.size,
            fileUrl: archiveUrl,
            archiveId: result.identifier,
            uploadedBy: displayName,
            uploadDate: new Date().toISOString(),
            playCount: 0
        };
        
        // Save to local storage
        saveSongToStorage(songData);
        
        // Show success with REAL URL
        showSuccessModal(archiveUrl);
        
        // Clear form
        document.getElementById('shortName').value = '';
        fileInput.value = '';
        document.getElementById('uploadPassword').value = '';
        document.getElementById('fileInfo').innerHTML = '';
        
        // Update library
        renderSongList();
        
        showUploadStatus('✅ Upload successful! File is now on Internet Archive.', 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        
        // Detailed error messages
        let errorMsg = `❌ Upload failed: ${error.message}`;
        
        if (error.message.includes('credentials') || error.message.includes('Access Denied')) {
            errorMsg += '<br><br>⚠️ Internet Archive API keys are incorrect or missing.<br>';
            errorMsg += 'Check Environment Variables in Vercel settings.';
        } else if (error.message.includes('Invalid password')) {
            errorMsg += '<br><br>⚠️ Wrong upload password.';
        } else if (error.message.includes('fetch')) {
            errorMsg += '<br><br>⚠️ Backend API not reachable. Check if /api/upload exists.';
        }
        
        showUploadStatus(errorMsg, 'error');
    } finally {
        // Re-enable upload button
        if (uploadBtn) uploadBtn.disabled = false;
        if (uploadText) uploadText.textContent = 'Upload Song';
        if (uploadSpinner) uploadSpinner.style.display = 'none';
    }
}

// ==================== GLOBAL FUNCTIONS ====================
// These MUST be global for onclick to work

window.showTab = function(tabName) {
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
        if (btn.textContent.includes(tabName) || btn.getAttribute('onclick')?.includes(tabName)) {
            btn.classList.add('active');
        }
    });
    
    // Update library if needed
    if (tabName === 'library') {
        renderSongList();
    }
};

window.saveSettings = function() {
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
};

window.uploadSong = async function() {
    // ... (keep the upload function you have) ...
};

window.copyUrl = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('✅ URL copied!');
    });
};

window.showSuccessModal = function(url) {
    const modal = document.getElementById('successModal');
    const urlDisplay = document.getElementById('successUrl');
    if (modal && urlDisplay) {
        urlDisplay.textContent = url;
        modal.style.display = 'flex';
    }
};

window.closeModal = function() {
    const modal = document.getElementById('successModal');
    if (modal) modal.style.display = 'none';
};

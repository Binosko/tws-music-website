async function uploadSong() {
    const shortName = document.getElementById('shortName').value.trim();
    const fileInput = document.getElementById('mp3File');
    const password = document.getElementById('uploadPassword').value;
    const displayName = localStorage.getItem('samp_displayName') || 'Anonymous';
    
    // Validation
    if (!shortName) return showUploadStatus('❌ Please enter a short name', 'error');
    if (!fileInput.files[0]) return showUploadStatus('❌ Please select an MP3 file', 'error');
    if (!password) return showUploadStatus('❌ Please enter upload password', 'error');
    
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
    uploadText.textContent = 'Uploading to Internet Archive...';
    uploadSpinner.style.display = 'block';
    showUploadStatus('📤 Connecting to Internet Archive...');
    
    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('shortName', shortName);
        formData.append('password', password);
        formData.append('displayName', displayName);
        formData.append('file', file);
        
        // Call our backend API
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Upload failed');
        }
        
        // Create song object with real Internet Archive URL
        const songData = {
            id: Date.now().toString(),
            shortName: shortName,
            fileName: file.name,
            fileSize: file.size,
            fileUrl: result.url,
            archiveId: result.identifier,
            uploadedBy: displayName,
            uploadDate: new Date().toISOString(),
            playCount: 0
        };
        
        // Save to local storage (for library display)
        saveSongToStorage(songData);
        
        // Show success
        showSuccessModal(result.url);
        
        // Clear form
        document.getElementById('shortName').value = '';
        document.getElementById('mp3File').value = '';
        document.getElementById('uploadPassword').value = '';
        document.getElementById('fileInfo').innerHTML = '';
        
        // Update library
        renderSongList();
        
        showUploadStatus('✅ Upload successful! File stored on Internet Archive.', 'success');
        
    } catch (error) {
        console.error('Upload error:', error);
        
        // Provide helpful error messages
        let errorMsg = `❌ Upload failed: ${error.message}`;
        if (error.message.includes('API keys')) {
            errorMsg += '<br><br>⚠️ The website owner needs to set up Internet Archive API keys.';
        } else if (error.message.includes('Invalid password')) {
            errorMsg += '<br><br>⚠️ Check the upload password.';
        }
        
        showUploadStatus(errorMsg, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadText.textContent = 'Upload Song';
        uploadSpinner.style.display = 'none';
    }
}

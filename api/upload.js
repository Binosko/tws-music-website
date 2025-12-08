export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('=== GITHUB UPLOAD API ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers);
    const bodyString = rawBody.toString('binary');
    
    // Get boundary
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No boundary found in Content-Type' });
    }
    
    const boundary = boundaryMatch[1];
    const parts = bodyString.split(`--${boundary}`);
    
    // Parse form fields
    let shortName = '', password = '', displayName = '', fileBuffer = null;
    let fileName = '';
    
    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data')) {
        // Get field name
        const nameMatch = part.match(/name="([^"]+)"/);
        if (!nameMatch) continue;
        
        const fieldName = nameMatch[1];
        
        if (fieldName === 'file') {
          // Extract filename
          const filenameMatch = part.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            fileName = filenameMatch[1];
            // Get file content (after headers)
            const fileContentMatch = part.match(/\r\n\r\n([\s\S]*)/);
            if (fileContentMatch) {
              fileBuffer = Buffer.from(fileContentMatch[1], 'binary');
            }
          }
        } else {
          // Regular form field
          const valueMatch = part.match(/\r\n\r\n([\s\S]*?)\r\n/);
          if (valueMatch) {
            const value = valueMatch[1].trim();
            
            if (fieldName === 'shortName') shortName = value;
            else if (fieldName === 'password') password = value;
            else if (fieldName === 'displayName') displayName = value;
          }
        }
      }
    }
    
    console.log('Parsed form:', { 
      shortName, 
      displayName, 
      fileName,
      fileSize: fileBuffer?.length || 0 
    });
    
    // Validation
    if (!shortName || !password || !fileBuffer) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        hasShortName: !!shortName,
        hasPassword: !!password,
        hasFile: !!fileBuffer
      });
    }
    
    // Check upload password
    const UPLOAD_PASS = process.env.UPLOAD_PASSWORD || 'ridingisFun123!';
    if (password !== UPLOAD_PASS) {
      return res.status(401).json({ error: 'Invalid upload password' });
    }
    
    // Get GitHub credentials
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
    
    if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
      return res.status(500).json({ 
        error: 'GitHub configuration missing',
        hasToken: !!GITHUB_TOKEN,
        hasUsername: !!GITHUB_USERNAME,
        help: 'Set GITHUB_TOKEN and GITHUB_USERNAME in Vercel Environment Variables'
      });
    }
    
    // Clean filename for URL
    const cleanName = shortName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const finalFileName = `${cleanName}.mp3`;
    
    // GitHub API: Upload file
    const githubApiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/tws-music-storage/contents/${finalFileName}`;
    
    console.log('Uploading to GitHub:', githubApiUrl);
    
    const githubResponse = await fetch(githubApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TWS-Music-Uploader'
      },
      body: JSON.stringify({
        message: `Upload: ${shortName} by ${displayName || 'Anonymous'}`,
        content: fileBuffer.toString('base64'),
        branch: 'main'
      })
    });
    
    const githubResult = await githubResponse.json();
    
    console.log('GitHub API response:', {
      status: githubResponse.status,
      message: githubResult.message,
      url: githubResult.content?.download_url
    });
    
    if (!githubResponse.ok) {
      throw new Error(githubResult.message || `GitHub upload failed (${githubResponse.status})`);
    }
    
    // Generate public raw URL (for SA:MP streaming)
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/tws-music-storage/main/${finalFileName}`;
    
    console.log('✅ Upload successful! Raw URL:', rawUrl);
    
    res.status(200).json({
      success: true,
      url: rawUrl,
      fileName: finalFileName,
      shortName: shortName,
      uploadedBy: displayName || 'Anonymous',
      githubUrl: githubResult.content?.html_url,
      message: 'File uploaded to GitHub successfully!'
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Provide helpful error messages
    let errorMessage = error.message;
    let helpText = 'Check GitHub token and repository permissions';
    
    if (error.message.includes('403') || error.message.includes('bad credentials')) {
      errorMessage = 'Invalid GitHub token. Generate a new token with repo permissions.';
      helpText = 'Go to https://github.com/settings/tokens and create new token with "repo" scope';
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      errorMessage = 'GitHub repository not found. Make sure "tws-music-storage" exists.';
      helpText = 'Create repository at: https://github.com/new (name: tws-music-storage)';
    } else if (error.message.includes('large')) {
      errorMessage = 'File too large for GitHub. Max 100MB per file.';
      helpText = 'Use smaller MP3 files (under 100MB)';
    }
    
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      details: errorMessage,
      help: helpText
    });
  }
}

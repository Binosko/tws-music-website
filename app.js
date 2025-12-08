export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('=== GITHUB UPLOAD START ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log environment (mask token)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
    
    console.log('Config check:', {
      hasToken: !!GITHUB_TOKEN,
      tokenPreview: GITHUB_TOKEN ? `${GITHUB_TOKEN.substring(0, 10)}...` : 'none',
      username: GITHUB_USERNAME
    });
    
    if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
      return res.status(500).json({
        success: false,
        error: 'GitHub not configured',
        help: 'Set GITHUB_TOKEN and GITHUB_USERNAME in Vercel'
      });
    }
    
    // Parse multipart form data
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const buffer = Buffer.concat(buffers);
    const body = buffer.toString('binary');
    
    // Get boundary
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    
    if (!boundaryMatch) {
      return res.status(400).json({
        success: false,
        error: 'No boundary found',
        help: 'Form data must be multipart/form-data'
      });
    }
    
    const boundary = boundaryMatch[1];
    const parts = body.split(`--${boundary}`);
    
    // Parse form fields
    let shortName = '', password = '', displayName = '', fileContent = null;
    
    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data')) {
        // Check field names
        if (part.includes('name="shortName"')) {
          const match = part.match(/name="shortName"[^]*?\r\n\r\n([^]*?)\r\n/);
          if (match) shortName = match[1].trim();
        }
        else if (part.includes('name="password"')) {
          const match = part.match(/name="password"[^]*?\r\n\r\n([^]*?)\r\n/);
          if (match) password = match[1].trim();
        }
        else if (part.includes('name="displayName"')) {
          const match = part.match(/name="displayName"[^]*?\r\n\r\n([^]*?)\r\n/);
          if (match) displayName = match[1].trim();
        }
        else if (part.includes('name="file"')) {
          // Extract file content
          const fileMatch = part.match(/\r\n\r\n([\s\S]*)/);
          if (fileMatch) {
            fileContent = Buffer.from(fileMatch[1], 'binary');
          }
        }
      }
    }
    
    console.log('Parsed form:', {
      shortName,
      password: password ? '***' : 'missing',
      displayName,
      fileSize: fileContent?.length || 0
    });
    
    // Validate
    if (!shortName || !password || !fileContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          hasShortName: !!shortName,
          hasPassword: !!password,
          hasFile: !!fileContent
        }
      });
    }
    
    // Check password
    const UPLOAD_PASS = process.env.UPLOAD_PASSWORD || 'ridingisFun123!';
    if (password !== UPLOAD_PASS) {
      return res.status(401).json({
        success: false,
        error: 'Invalid upload password'
      });
    }
    
    // Clean filename
    const cleanName = shortName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `${cleanName}.mp3`;
    
    // Upload to GitHub
    const githubUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/tws-music-storage/contents/${fileName}`;
    
    console.log('Uploading to GitHub:', githubUrl);
    
    const githubResponse = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TWS-Music-Uploader/1.0'
      },
      body: JSON.stringify({
        message: `SA:MP Music: ${shortName} uploaded by ${displayName || 'Anonymous'}`,
        content: fileContent.toString('base64'),
        branch: 'main'
      })
    });
    
    const githubResult = await githubResponse.json();
    
    console.log('GitHub API response:', {
      status: githubResponse.status,
      message: githubResult.message,
      downloadUrl: githubResult.content?.download_url
    });
    
    if (!githubResponse.ok) {
      // Provide helpful error messages
      let errorMsg = githubResult.message || 'GitHub upload failed';
      let helpText = 'Check token permissions and repository access';
      
      if (githubResult.message?.includes('large')) {
        errorMsg = 'File too large (max 100MB)';
        helpText = 'Use smaller MP3 files';
      } else if (githubResult.message?.includes('exists')) {
        errorMsg = 'File already exists with this name';
        helpText = 'Use a different short name';
      } else if (githubResponse.status === 403) {
        errorMsg = 'GitHub token lacks write permissions';
        helpText = 'Token needs "Contents: Read and write" permission';
      }
      
      return res.status(500).json({
        success: false,
        error: 'Upload failed',
        details: errorMsg,
        help: helpText,
        githubError: githubResult.message
      });
    }
    
    // Generate raw.githubusercontent.com URL (for SA:MP)
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/tws-music-storage/main/${fileName}`;
    
    console.log('✅ Upload successful! Raw URL:', rawUrl);
    
    res.status(200).json({
      success: true,
      url: rawUrl,
      fileName: fileName,
      shortName: shortName,
      uploadedBy: displayName || 'Anonymous',
      message: 'File uploaded to GitHub successfully!',
      githubUrl: githubResult.content?.html_url
    });
    
  } catch (error) {
    console.error('❌ Server error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message,
      help: 'Check server logs for details'
    });
  }
}

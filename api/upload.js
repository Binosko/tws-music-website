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
    // Check environment
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
    
    console.log('Config:', {
      hasToken: !!GITHUB_TOKEN,
      hasUsername: !!GITHUB_USERNAME,
      username: GITHUB_USERNAME
    });
    
    if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
      return res.status(500).json({
        success: false,
        error: 'GitHub not configured',
        help: 'Set GITHUB_TOKEN and GITHUB_USERNAME in Vercel'
      });
    }
    
    // Parse form data
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
        error: 'No boundary found'
      });
    }
    
    const boundary = boundaryMatch[1];
    const parts = body.split(`--${boundary}`);
    
    // Parse fields
    let shortName = '', password = '', displayName = '', fileContent = null;
    
    for (const part of parts) {
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
        const fileMatch = part.match(/\r\n\r\n([\s\S]*)/);
        if (fileMatch) {
          fileContent = Buffer.from(fileMatch[1], 'binary');
        }
      }
    }
    
    console.log('Parsed:', { shortName, displayName, fileSize: fileContent?.length });
    
    // Validate
    if (!shortName || !password || !fileContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing fields'
      });
    }
    
    // Check password
    if (password !== (process.env.UPLOAD_PASSWORD || 'ridingisFun123!')) {
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
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `SA:MP Music: ${shortName} by ${displayName || 'Anonymous'}`,
        content: fileContent.toString('base64'),
        branch: 'main'
      })
    });
    
    const githubResult = await githubResponse.json();
    
    console.log('GitHub response:', {
      status: githubResponse.status,
      message: githubResult.message
    });
    
    if (!githubResponse.ok) {
      return res.status(500).json({
        success: false,
        error: 'GitHub upload failed',
        details: githubResult.message,
        help: 'Check token permissions'
      });
    }
    
    // Success! Generate raw URL
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/tws-music-storage/main/${fileName}`;
    
    console.log('✅ SUCCESS! URL:', rawUrl);
    
    res.status(200).json({
      success: true,
      url: rawUrl,
      fileName: fileName,
      message: 'Uploaded to GitHub successfully!'
    });
    
  } catch (error) {
    console.error('Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  }
}

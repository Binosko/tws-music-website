import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Simple helper to get form field
function getFormValue(part, fieldName) {
  const regex = new RegExp(`name="${fieldName}"[\\s\\S]*?\\r\\n\\r\\n([\\s\\S]*?)\\r\\n`);
  const match = part.match(regex);
  return match ? match[1].trim() : '';
}

export default async function handler(req, res) {
  console.log('=== API CALLED ===', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const buffer = Buffer.concat(buffers);
    const body = buffer.toString('binary');
    
    // Get boundary
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.*)/);
    
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No boundary in Content-Type' });
    }
    
    const boundary = boundaryMatch[1];
    const parts = body.split(`--${boundary}`);
    
    let shortName = '';
    let password = '';
    let displayName = '';
    let fileBuffer = null;
    let fileName = '';
    
    // Parse each part
    for (const part of parts) {
      if (part.includes('Content-Disposition')) {
        // Check field names
        if (part.includes('name="shortName"')) {
          shortName = getFormValue(part, 'shortName');
        } else if (part.includes('name="password"')) {
          password = getFormValue(part, 'password');
        } else if (part.includes('name="displayName"')) {
          displayName = getFormValue(part, 'displayName');
        } else if (part.includes('name="file"')) {
          // Extract filename
          const filenameMatch = part.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            fileName = filenameMatch[1];
            // Get file content (after the headers)
            const filePart = part.split('\r\n\r\n')[1];
            if (filePart) {
              fileBuffer = Buffer.from(filePart, 'binary');
            }
          }
        }
      }
    }
    
    console.log('Parsed:', { shortName, password, displayName, fileName, fileSize: fileBuffer?.length });
    
    // Validation
    if (!shortName || !password || !fileBuffer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check password
    const UPLOAD_PASS = process.env.UPLOAD_PASSWORD || 'ridingisFun123!';
    if (password !== UPLOAD_PASS) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Check Internet Archive keys
    const IA_KEY = process.env.IA_ACCESS_KEY;
    const IA_SECRET = process.env.IA_SECRET_KEY;
    
    if (!IA_KEY || !IA_SECRET) {
      return res.status(500).json({ 
        error: 'Internet Archive API keys missing',
        help: 'Set IA_ACCESS_KEY and IA_SECRET_KEY in Vercel'
      });
    }
    
    // Clean name
    const cleanName = shortName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const identifier = `tws-music-${cleanName}-${Date.now()}`;
    const archiveFileName = `${cleanName}.mp3`;
    
    console.log('Uploading to Internet Archive as:', identifier);
    
    // Create S3 client for Internet Archive
    const s3Client = new S3Client({
      endpoint: 'https://s3.us.archive.org',
      region: 'us-east-1',
      credentials: {
        accessKeyId: IA_KEY,
        secretAccessKey: IA_SECRET,
      },
      forcePathStyle: true,
    });
    
    // Upload to Internet Archive
    const uploadParams = {
      Bucket: identifier,
      Key: archiveFileName,
      Body: fileBuffer,
      ContentType: 'audio/mpeg',
      Metadata: {
        'x-archive-auto-make-bucket': '1',
        'x-archive-meta-title': shortName,
        'x-archive-meta-creator': displayName || 'Anonymous',
        'x-archive-meta-description': 'SA:MP Music Upload',
        'x-archive-meta-mediatype': 'audio',
        'x-archive-meta-collection': 'opensource_audio',
      },
    };
    
    console.log('Sending to Internet Archive...');
    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log('Upload successful!');
    
    // Generate URL
    const archiveUrl = `https://archive.org/download/${identifier}/${archiveFileName}`;
    
    res.status(200).json({
      success: true,
      url: archiveUrl,
      identifier: identifier,
      message: 'Uploaded to Internet Archive successfully!'
    });
    
  } catch (error) {
    console.error('SERVER ERROR:', error);
    
    let errorMsg = error.message;
    if (error.name === 'InvalidAccessKeyId') {
      errorMsg = 'Invalid Internet Archive API keys. Get new keys from archive.org/account/s3.php';
    } else if (error.name === 'AccessDenied') {
      errorMsg = 'Access denied by Internet Archive. Check API keys.';
    }
    
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      details: errorMsg,
      help: 'Check Vercel Environment Variables: IA_ACCESS_KEY and IA_SECRET_KEY'
    });
  }
}

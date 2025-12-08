import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('API called - method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data manually
    const formData = await parseMultipartForm(req);
    
    const { shortName, password, displayName, file } = formData;
    
    console.log('Received:', { shortName, displayName, fileSize: file?.buffer?.length });
    
    // Validate
    if (!shortName || !password || !file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check password
    const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'ridingisFun123!';
    if (password !== UPLOAD_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Check Internet Archive API keys
    const IA_ACCESS_KEY = process.env.IA_ACCESS_KEY;
    const IA_SECRET_KEY = process.env.IA_SECRET_KEY;
    
    if (!IA_ACCESS_KEY || !IA_SECRET_KEY) {
      return res.status(500).json({ 
        error: 'Internet Archive API keys not configured',
        help: 'Set IA_ACCESS_KEY and IA_SECRET_KEY in Vercel Environment Variables'
      });
    }

    // Clean short name for URL
    const cleanName = shortName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const identifier = `tws-music-${cleanName}-${Date.now()}`;
    const fileName = `${cleanName}.mp3`;

    console.log('Uploading to Internet Archive:', identifier);

    // Configure Internet Archive S3 client
    const s3Client = new S3Client({
      endpoint: 'https://s3.us.archive.org',
      region: 'us-east-1',
      credentials: {
        accessKeyId: IA_ACCESS_KEY,
        secretAccessKey: IA_SECRET_KEY,
      },
      forcePathStyle: true,
    });

    // Upload to Internet Archive
    const uploadParams = {
      Bucket: identifier,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype || 'audio/mpeg',
      Metadata: {
        'x-archive-meta01-title': shortName,
        'x-archive-meta02-description': `TWS SA:MP Music - ${shortName}`,
        'x-archive-meta03-subject': 'music; gaming; gta; samp',
        'x-archive-meta04-collection': 'opensource_audio',
        'x-archive-meta05-mediatype': 'audio',
        'x-archive-meta06-creator': displayName || 'Anonymous',
        'x-archive-auto-make-bucket': '1',
      },
    };

    console.log('Sending to Internet Archive...');
    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log('Upload successful to Internet Archive!');

    // Generate the public URL
    const archiveUrl = `https://archive.org/download/${identifier}/${fileName}`;
    
    // Return success
    res.status(200).json({
      success: true,
      url: archiveUrl,
      identifier: identifier,
      message: 'Successfully uploaded to Internet Archive!'
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Provide helpful error messages
    let errorMessage = error.message;
    if (error.message.includes('AccessDenied') || error.message.includes('InvalidAccessKeyId')) {
      errorMessage = 'Invalid Internet Archive API keys. Check IA_ACCESS_KEY and IA_SECRET_KEY.';
    } else if (error.message.includes('NoSuchBucket')) {
      errorMessage = 'Internet Archive bucket error. Try a different short name.';
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Upload failed',
      details: errorMessage
    });
  }
}

// Simple multipart form parser
async function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const body = buffer.toString('binary');
        
        // Extract boundary from Content-Type
        const contentType = req.headers['content-type'];
        const boundary = contentType.split('boundary=')[1];
        
        if (!boundary) {
          throw new Error('No boundary in Content-Type');
        }
        
        // Split by boundary
        const parts = body.split(`--${boundary}`);
        
        const formData = {
          shortName: '',
          password: '',
          displayName: '',
          file: null
        };
        
        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            // Check if it's a field or file
            if (part.includes('name="shortName"')) {
              const match = part.match(/name="shortName"[^]*?\r\n\r\n([^]*?)\r\n/);
              if (match) formData.shortName = match[1].trim();
            }
            else if (part.includes('name="password"')) {
              const match = part.match(/name="password"[^]*?\r\n\r\n([^]*?)\r\n/);
              if (match) formData.password = match[1].trim();
            }
            else if (part.includes('name="displayName"')) {
              const match = part.match(/name="displayName"[^]*?\r\n\r\n([^]*?)\r\n/);
              if (match) formData.displayName = match[1].trim();
            }
            else if (part.includes('name="file"')) {
              // Extract file
              const filenameMatch = part.match(/filename="([^"]+)"/);
              if (filenameMatch) {
                const fileContent = part.split('\r\n\r\n')[1];
                formData.file = {
                  buffer: Buffer.from(fileContent, 'binary'),
                  filename: filenameMatch[1],
                  mimetype: 'audio/mpeg'
                };
              }
            }
          }
        }
        
        resolve(formData);
      } catch (error) {
        reject(error);
      }
    });
    
    req.on('error', reject);
  });
}

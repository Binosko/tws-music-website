import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const formData = await new Promise((resolve, reject) => {
      let data = [];
      req.on('data', chunk => data.push(chunk));
      req.on('end', () => resolve(Buffer.concat(data)));
      req.on('error', reject);
    });

    // Extract data from form
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const parts = formData.toString('binary').split(`--${boundary}`);
    
    let shortName = '';
    let password = '';
    let displayName = '';
    let fileData = null;
    let fileName = '';
    let contentType = '';

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data')) {
        const nameMatch = part.match(/name="([^"]+)"/);
        if (nameMatch) {
          const name = nameMatch[1];
          const value = part.split('\r\n\r\n')[1];
          
          if (name === 'shortName') shortName = value.trim();
          else if (name === 'password') password = value.trim();
          else if (name === 'displayName') displayName = value.trim();
          else if (name === 'file' && part.includes('filename="')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              fileName = filenameMatch[1];
              const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
              contentType = contentTypeMatch ? contentTypeMatch[1] : 'audio/mpeg';
              fileData = Buffer.from(part.split('\r\n\r\n')[1], 'binary');
            }
          }
        }
      }
    }

    // Validate
    if (!shortName || !password || !fileData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check password (you can change this)
    const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'ridingisFun123!';
    if (password !== UPLOAD_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Clean short name for URL
    const cleanShortName = shortName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Generate unique identifier for Internet Archive
    const identifier = `samp-music-${cleanShortName}-${Date.now()}`;
    const archiveFileName = `${cleanShortName}.mp3`;

    // Configure Internet Archive S3 client
    const s3Client = new S3Client({
      endpoint: 'https://s3.us.archive.org',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.IA_ACCESS_KEY,
        secretAccessKey: process.env.IA_SECRET_KEY,
      },
      forcePathStyle: true,
    });

    // Upload to Internet Archive
    const uploadParams = {
      Bucket: identifier, // Each upload gets its own "bucket" (item)
      Key: archiveFileName,
      Body: fileData,
      ContentType: contentType,
      Metadata: {
        'x-archive-meta01-title': shortName,
        'x-archive-meta02-description': `SA:MP Music - ${shortName}`,
        'x-archive-meta03-subject': 'music; gaming; gta; samp',
        'x-archive-meta04-collection': 'opensource_audio',
        'x-archive-meta05-mediatype': 'audio',
        'x-archive-meta06-creator': displayName || 'Anonymous',
        'x-archive-auto-make-bucket': '1',
      },
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Generate public URL
    const publicUrl = `https://archive.org/download/${identifier}/${archiveFileName}`;

    // Return success
    res.status(200).json({
      success: true,
      url: publicUrl,
      identifier: identifier,
      shortName: shortName,
      displayName: displayName || 'Anonymous',
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message,
      note: 'Make sure your Internet Archive API keys are correct'
    });
  }
}

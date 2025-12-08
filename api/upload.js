import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Busboy from 'busboy';

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
    const formData = await parseFormData(req);
    
    const { shortName, password, displayName, file } = formData;
    
    // Validate
    if (!shortName || !password || !file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check password
    if (password !== process.env.UPLOAD_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Clean short name
    const cleanName = shortName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const identifier = `tws-music-${cleanName}-${Date.now()}`;
    const fileName = `${cleanName}.mp3`;

    // Upload to Internet Archive
    const s3Client = new S3Client({
      endpoint: 'https://s3.us.archive.org',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.IA_ACCESS_KEY,
        secretAccessKey: process.env.IA_SECRET_KEY,
      },
      forcePathStyle: true,
    });

    const uploadParams = {
      Bucket: identifier,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
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

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Return real Internet Archive URL
    const archiveUrl = `https://archive.org/download/${identifier}/${fileName}`;
    
    res.status(200).json({
      success: true,
      url: archiveUrl,
      identifier: identifier,
      message: 'Uploaded to Internet Archive successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message
    });
  }
}

function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const formData = {};
    
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const chunks = [];
      file.on('data', chunk => chunks.push(chunk));
      file.on('end', () => {
        formData.file = {
          buffer: Buffer.concat(chunks),
          filename,
          mimetype
        };
      });
    });
    
    busboy.on('field', (fieldname, val) => {
      formData[fieldname] = val;
    });
    
    busboy.on('finish', () => {
      resolve(formData);
    });
    
    busboy.on('error', reject);
    
    req.pipe(busboy);
  });
}

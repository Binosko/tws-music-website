import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('=== UPLOAD START ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers);
    
    // Convert to string for parsing
    const bodyString = rawBody.toString('binary');
    
    // Get boundary
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No boundary found' });
    }
    
    const boundary = boundaryMatch[1];
    const parts = bodyString.split(`--${boundary}`);
    
    // Parse form data
    let shortName = '', password = '', displayName = '', fileContent = null;
    
    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data')) {
        // Get field name
        const nameMatch = part.match(/name="([^"]+)"/);
        if (!nameMatch) continue;
        
        const fieldName = nameMatch[1];
        const valueMatch = part.match(/\r\n\r\n([\s\S]*?)\r\n/);
        
        if (fieldName === 'file') {
          // It's a file - get the actual content
          const fileMatch = part.match(/\r\n\r\n([\s\S]*)/);
          if (fileMatch) {
            fileContent = Buffer.from(fileMatch[1], 'binary');
          }
        } else if (valueMatch) {
          // It's a regular field
          const value = valueMatch[1].trim();
          
          if (fieldName === 'shortName') shortName = value;
          else if (fieldName === 'password') password = value;
          else if (fieldName === 'displayName') displayName = value;
        }
      }
    }
    
    console.log('Parsed:', { 
      shortName, 
      password: password ? '***' : 'missing',
      displayName,
      fileSize: fileContent?.length || 0
    });
    
    // Validate
    if (!shortName || !password || !fileContent) {
      return res.status(400).json({ 
        error: 'Missing fields',
        hasShortName: !!shortName,
        hasPassword: !!password,
        hasFile: !!fileContent
      });
    }
    
    // Check password
    const UPLOAD_PASS = process.env.UPLOAD_PASSWORD || 'ridingisFun123!';
    if (password !== UPLOAD_PASS) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Get IA keys
    const IA_KEY = process.env.IA_ACCESS_KEY;
    const IA_SECRET = process.env.IA_SECRET_KEY;
    
    if (!IA_KEY || !IA_SECRET) {
      return res.status(500).json({ 
        error: 'Internet Archive keys not configured',
        hasAccessKey: !!IA_KEY,
        hasSecretKey: !!IA_SECRET
      });
    }
    
    // Clean name for URL
    const cleanName = shortName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const identifier = `tws-music-${cleanName}-${Date.now()}`;
    const fileName = `${cleanName}.mp3`;
    
    console.log('Uploading to IA:', identifier);
    
    // Create S3 client
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
      Key: fileName,
      Body: fileContent,
      ContentType: 'audio/mpeg',
      Metadata: {
        'x-archive-auto-make-bucket': '1',
        'x-archive-meta-title': shortName,
        'x-archive-meta-creator': displayName || 'Anonymous'
      },
    };
    
    console.log('Sending to Internet Archive...');
    const result = await s3Client.send(new PutObjectCommand(uploadParams));
    console.log('IA Response:', result);
    
    // Generate public URL
    const archiveUrl = `https://archive.org/download/${identifier}/${fileName}`;
    
    console.log('✅ SUCCESS! URL:', archiveUrl);
    
    res.status(200).json({
      success: true,
      url: archiveUrl,
      identifier: identifier,
      message: 'Uploaded to Internet Archive successfully!'
    });
    
  } catch (error) {
    console.error('❌ UPLOAD ERROR:', error);
    console.error('Error name:', error.name);
    console.error('Error code:', error.Code);
    console.error('Error message:', error.message);
    
    // Return detailed error
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      errorName: error.name,
      errorCode: error.Code,
      details: error.message,
      help: 'Check Internet Archive API keys and file format'
    });
  }
}

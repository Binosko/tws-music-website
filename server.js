const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const app = express();

const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { shortName, password, displayName } = req.body;
        const file = req.file;
        
        // Validate
        if (!shortName || !password || !file) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        
        // Check password (you set this)
        if (password !== 'ridingisFun123!') {
            return res.status(401).json({ error: 'Invalid password' });
        }
        
        // Clean name
        const cleanName = shortName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const identifier = `tws-music-${cleanName}-${Date.now()}`;
        const fileName = `${cleanName}.mp3`;
        
        // Upload to Internet Archive
        const s3Client = new S3Client({
            endpoint: 'https://s3.us.archive.org',
            region: 'us-east-1',
            credentials: {
                accessKeyId: process.env.IA_ACCESS_KEY || 'YOUR_KEY',
                secretAccessKey: process.env.IA_SECRET_KEY || 'YOUR_SECRET'
            },
            forcePathStyle: true,
        });
        
        await s3Client.send(new PutObjectCommand({
            Bucket: identifier,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata: {
                'x-archive-auto-make-bucket': '1',
                'x-archive-meta-title': shortName,
                'x-archive-meta-creator': displayName || 'Anonymous'
            }
        }));
        
        const archiveUrl = `https://archive.org/download/${identifier}/${fileName}`;
        
        res.json({
            success: true,
            url: archiveUrl,
            message: 'Uploaded to Internet Archive'
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

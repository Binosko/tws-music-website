import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Log that API is called
  console.log('API called - method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For now, just return a test success
    // This proves API is working
    const testUrl = 'https://archive.org/download/test-audio/test.mp3';
    
    return res.status(200).json({
      success: true,
      url: testUrl,
      identifier: 'test-audio',
      message: 'TEST MODE: API is working! Real uploads disabled for testing.'
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'API error',
      details: error.message
    });
  }
}

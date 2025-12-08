export default async function handler(req, res) {
  const IA_KEY = process.env.IA_ACCESS_KEY;
  const IA_SECRET = process.env.IA_SECRET_KEY;
  
  const identifier = `tws-diagnostic-${Date.now()}`;
  
  console.log('Testing IA keys:', { 
    hasKey: !!IA_KEY, 
    hasSecret: !!IA_SECRET,
    keyLength: IA_KEY?.length,
    secretLength: IA_SECRET?.length
  });
  
  try {
    // Direct HTTP request to Internet Archive
    const response = await fetch(`https://s3.us.archive.org/${identifier}/test.txt`, {
      method: 'PUT',
      headers: {
        'Authorization': `LOW ${IA_KEY}:${IA_SECRET}`,
        'x-archive-auto-make-bucket': '1',
        'Content-Type': 'text/plain'
      },
      body: 'Diagnostic test file from TWS Music'
    });
    
    const responseText = await response.text();
    
    res.json({
      success: response.ok,
      status: response.status,
      response: responseText,
      testUrl: `https://archive.org/download/${identifier}/test.txt`,
      message: response.ok ? '✅ Internet Archive keys are working!' : '❌ Keys failed'
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      details: 'Cannot connect to Internet Archive'
    });
  }
}

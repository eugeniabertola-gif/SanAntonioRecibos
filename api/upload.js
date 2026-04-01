const https = require('https');
const { URL } = require('url');

// Vercel serverless functions have a 4.5MB body limit on hobby plan.
// For large files, consider upgrading or chunking.
module.exports = async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // CORS headers for the frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.HUMAND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'HUMAND_API_KEY not configured' });
    return;
  }

  // Read the raw body as a buffer
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const bodyBuffer = Buffer.concat(chunks);

  // Get the userId (DNI) from query param
  const userId = req.query.userId;
  if (!userId) {
    res.status(400).json({ error: 'Missing userId query parameter' });
    return;
  }

  const targetUrl = `https://api-prod.humand.co/public/api/v1/users/${userId}/documents/files`;
  const parsedUrl = new URL(targetUrl);

  // Forward the request with the same content-type (multipart/form-data)
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': req.headers['content-type'],
      'Content-Length': bodyBuffer.length,
    },
  };

  return new Promise((resolve) => {
    const proxyReq = https.request(options, (proxyRes) => {
      const responseChunks = [];
      proxyRes.on('data', (chunk) => responseChunks.push(chunk));
      proxyRes.on('end', () => {
        const responseBody = Buffer.concat(responseChunks).toString('utf-8');
        res.status(proxyRes.statusCode).send(responseBody);
        resolve();
      });
    });

    proxyReq.on('error', (err) => {
      res.status(502).json({ error: 'Proxy error', details: err.message });
      resolve();
    });

    proxyReq.write(bodyBuffer);
    proxyReq.end();
  });
};

// Disable Vercel's body parser so we get the raw multipart stream
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

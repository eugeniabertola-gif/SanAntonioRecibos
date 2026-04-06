const https = require('https');
const { URL } = require('url');

module.exports = async function handler(req, res) {
  // CORS headers FIRST — must be present before any early return
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only POST after preflight is handled
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.HUMAND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'HUMAND_API_KEY not configured' });
    return;
  }

  const userId = req.query.userId;
  if (!userId) {
    res.status(400).json({ error: 'Missing userId query parameter' });
    return;
  }

  // Read the raw body — handle both Vercel runtime styles:
  // 1. req.body already a Buffer (newer runtimes with bodyParser:false)
  // 2. req is a readable stream (older runtimes)
  let bodyBuffer;
  if (req.body && Buffer.isBuffer(req.body)) {
    bodyBuffer = req.body;
  } else if (req.body && typeof req.body === 'string') {
    bodyBuffer = Buffer.from(req.body);
  } else {
    try {
      const chunks = [];
      await new Promise((resolve, reject) => {
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', resolve);
        req.on('error', reject);
        setTimeout(() => {
          if (chunks.length === 0) reject(new Error('Body read timeout'));
          else resolve();
        }, 10000);
      });
      bodyBuffer = Buffer.concat(chunks);
    } catch (e) {
      res.status(400).json({ error: 'Could not read request body', details: e.message });
      return;
    }
  }

  if (!bodyBuffer || bodyBuffer.length === 0) {
    res.status(400).json({ error: 'Empty request body' });
    return;
  }

  const targetUrl = `https://api-prod.humand.co/public/api/v1/users/${userId}/documents/files`;
  const parsedUrl = new URL(targetUrl);

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

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

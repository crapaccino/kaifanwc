const path = require('path');

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
}

module.exports = async (req, res) => {
  const functionName = req.query.function;

  if (!functionName || Array.isArray(functionName) || !/^[a-z0-9-]+$/i.test(functionName)) {
    return res.status(400).json({ error: 'Invalid API function' });
  }

  try {
    const functionPath = path.join(process.cwd(), 'netlify', 'functions', `${functionName}.js`);
    const fn = require(functionPath);

    if (!fn || typeof fn.handler !== 'function') {
      return res.status(404).json({ error: 'API function not found' });
    }

    const queryStringParameters = { ...req.query };
    delete queryStringParameters.function;

    const event = {
      httpMethod: req.method,
      headers: normalizeHeaders(req.headers),
      queryStringParameters,
      body: req.body && typeof req.body === 'object' ? JSON.stringify(req.body) : (req.body || '')
    };

    const result = await fn.handler(event);
    const headers = result.headers || {};
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

    return res.status(result.statusCode || 200).send(result.body || '');
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      return res.status(404).json({ error: 'API function not found' });
    }
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

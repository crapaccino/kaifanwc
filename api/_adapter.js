function getBody(req) {
  if (!req.body) return '';
  if (typeof req.body === 'string') return req.body;
  return JSON.stringify(req.body);
}

function toEvent(req) {
  return {
    httpMethod: req.method,
    headers: req.headers || {},
    queryStringParameters: req.query || {},
    body: getBody(req)
  };
}

function send(res, result) {
  const statusCode = result.statusCode || 200;
  const headers = result.headers || {};

  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) res.setHeader(key, value);
  });

  res.status(statusCode).send(result.body || '');
}

function wrap(handler) {
  return async function vercelHandler(req, res) {
    try {
      const result = await handler(toEvent(req));
      send(res, result);
    } catch (e) {
      res.status(500).json({ error: e.message || 'Server error' });
    }
  };
}

module.exports = { wrap };

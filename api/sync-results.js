const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/sync-results');

module.exports = wrap(handler);

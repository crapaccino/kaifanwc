const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/claim-player');

module.exports = wrap(handler);

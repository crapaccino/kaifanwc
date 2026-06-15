const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/get-player');

module.exports = wrap(handler);
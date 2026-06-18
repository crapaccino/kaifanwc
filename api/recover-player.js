const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/recover-player');

module.exports = wrap(handler);

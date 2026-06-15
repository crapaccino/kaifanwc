const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/get-state');

module.exports = wrap(handler);
const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/get-live');

module.exports = wrap(handler);
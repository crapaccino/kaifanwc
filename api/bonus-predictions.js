const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/bonus-predictions');

module.exports = wrap(handler);

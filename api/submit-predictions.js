const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/submit-predictions');

module.exports = wrap(handler);
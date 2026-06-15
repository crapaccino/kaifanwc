const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/admin-set-result');

module.exports = wrap(handler);
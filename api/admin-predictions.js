const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/admin-predictions');

module.exports = wrap(handler);
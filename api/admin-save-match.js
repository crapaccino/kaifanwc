const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/admin-save-match');

module.exports = wrap(handler);
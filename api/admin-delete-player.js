const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/admin-delete-player');

module.exports = wrap(handler);

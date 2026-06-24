const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/admin-unlock-round');

module.exports = wrap(handler);

const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/admin-seed-semi-finals');

module.exports = wrap(handler);

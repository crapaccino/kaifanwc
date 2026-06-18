const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/admin-update-prediction');

module.exports = wrap(handler);

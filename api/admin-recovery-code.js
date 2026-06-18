const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/admin-recovery-code');

module.exports = wrap(handler);

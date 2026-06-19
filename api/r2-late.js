const { wrap } = require('./_adapter');
const { handler } = require('../netlify/functions/submit-r2-late-predictions');
module.exports = wrap(handler);

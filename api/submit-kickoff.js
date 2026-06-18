const { wrap } = require('./_adapter');
const mod = require('../netlify/functions/submit-predictions-kickoff');
module.exports = wrap(mod.handler);

const { handler } = require('../netlify/functions/admin-seed-final');

module.exports = (req, res) => handler(req, res);

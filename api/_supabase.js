const { createClient } = require('@supabase/supabase-js');

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

function json(res, statusCode, body) {
  res.status(statusCode).json(body);
}

function requireAdmin(req) {
  const pass = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD) {
    throw new Error('Admin password is wrong');
  }
}

module.exports = { client, json, requireAdmin };

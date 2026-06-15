const { createClient } = require('@supabase/supabase-js');

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}
function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) };
}
function requireAdmin(event) {
  const pass = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD) throw new Error('Admin password is wrong');
}
function winnerOf(m) {
  if (m.home_score === null || m.away_score === null || m.home_score === undefined || m.away_score === undefined) return null;
  if (m.home_score > m.away_score) return 'home';
  if (m.away_score > m.home_score) return 'away';
  return 'draw';
}
function scorePrediction(pred, match) {
  const actual = winnerOf(match);
  if (!actual) return 0;
  let pts = 0;
  if (pred.predicted_winner === actual) pts += 3;
  if (pred.home_score === match.home_score && pred.away_score === match.away_score) pts += 2;
  return pts;
}
module.exports = { client, json, requireAdmin, winnerOf, scorePrediction };

const { client, json, requireAdmin } = require('./_supabase');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  try {
    requireAdmin(event);
    const b = JSON.parse(event.body || '{}');
    const { error } = await client().from('matches').update({
      home_score: Number.isInteger(b.home_score) ? b.home_score : null,
      away_score: Number.isInteger(b.away_score) ? b.away_score : null
    }).eq('id', String(b.match_id));
    if (error) throw error;
    return json(200, { ok: true });
  } catch (e) { return json(401, { error: e.message }); }
};

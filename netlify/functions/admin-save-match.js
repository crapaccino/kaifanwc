const { client, json, requireAdmin } = require('./_supabase');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  try {
    requireAdmin(event);
    const b = JSON.parse(event.body || '{}');
    const row = {
      id: String(b.id || crypto.randomUUID()),
      round: String(b.round || 'Next Stage'),
      group_name: b.group_name ? String(b.group_name) : null,
      home: String(b.home || '').trim(),
      away: String(b.away || '').trim(),
      kickoff: new Date(b.kickoff).toISOString(),
      is_active: b.is_active !== false
    };
    if (!row.home || !row.away || row.kickoff === 'Invalid Date') return json(400, { error: 'Missing match details' });
    const { error } = await client().from('matches').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    return json(200, { ok: true, match: row });
  } catch (e) { return json(401, { error: e.message }); }
};

const { client, json } = require('./_supabase');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  try {
    const body = JSON.parse(event.body || '{}');
    const nickname = String(body.nickname || '').trim().slice(0, 40);
    const predictions = Array.isArray(body.predictions) ? body.predictions : [];
    if (!nickname) return json(400, { error: 'Enter a nickname' });
    if (!predictions.length) return json(400, { error: 'No predictions selected' });
    const sb = client();
    const ids = predictions.map(p => p.match_id);
    const { data: matches, error: mErr } = await sb.from('matches').select('id,kickoff').in('id', ids);
    if (mErr) throw mErr;
    const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));
    const now = Date.now();
    const blocked = predictions.find(p => !matchMap[p.match_id] || new Date(matchMap[p.match_id].kickoff).getTime() <= now);
    if (blocked) return json(400, { error: 'One or more matches are locked because kickoff has started.' });
    const { data: player, error: upErr } = await sb.from('players').upsert({ nickname }, { onConflict: 'nickname' }).select().single();
    if (upErr) throw upErr;
    const rows = predictions.map(p => ({
      player_id: player.id,
      match_id: p.match_id,
      predicted_winner: p.predicted_winner,
      home_score: Number.isInteger(p.home_score) ? p.home_score : null,
      away_score: Number.isInteger(p.away_score) ? p.away_score : null,
      updated_at: new Date().toISOString()
    }));
    const { error } = await sb.from('predictions').upsert(rows, { onConflict: 'player_id,match_id' });
    if (error) throw error;
    return json(200, { ok: true, saved: rows.length });
  } catch (e) { return json(500, { error: e.message }); }
};

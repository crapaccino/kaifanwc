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

    const { data: matches, error: mErr } = await sb
      .from('matches')
      .select('id,round,kickoff')
      .in('id', ids);

    if (mErr) throw mErr;

    const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));
    const now = Date.now();
    const rounds = [...new Set(matches.map(m => m.round))];

    const { data: roundMatches, error: rErr } = await sb
      .from('matches')
      .select('round,kickoff')
      .in('round', rounds)
      .eq('is_active', true)
      .order('kickoff', { ascending: true });

    if (rErr) throw rErr;

    const roundLock = {};
    for (const m of roundMatches) {
      if (!roundLock[m.round]) roundLock[m.round] = new Date(m.kickoff).getTime();
    }

    const blocked = predictions.find(p => {
      const match = matchMap[p.match_id];
      if (!match) return true;
      const lockTime = roundLock[match.round];
      return lockTime && now >= lockTime;
    });

    if (blocked) {
      return json(400, {
        error: 'This round is locked because the first game of the round has already kicked off.'
      });
    }

    const { data: player, error: upErr } = await sb
      .from('players')
      .upsert({ nickname }, { onConflict: 'nickname' })
      .select()
      .single();

    if (upErr) throw upErr;

    const rows = predictions.map(p => ({
      player_id: player.id,
      match_id: p.match_id,
      predicted_winner: p.predicted_winner,
      home_score: Number.isInteger(p.home_score) ? p.home_score : null,
      away_score: Number.isInteger(p.away_score) ? p.away_score : null,
      updated_at: new Date().toISOString()
    }));

    const { error } = await sb
      .from('predictions')
      .upsert(rows, { onConflict: 'player_id,match_id' });

    if (error) throw error;

    return json(200, { ok: true, saved: rows.length });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

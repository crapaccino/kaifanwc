const { client, json } = require('./_supabase');
const START = Date.parse('2026-06-19T19:00:00.000Z');
const n = v => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
const okScore = v => Number.isInteger(v) && v >= 0 && v <= 20;
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  try {
    const body = JSON.parse(event.body || '{}');
    const nickname = n(body.nickname);
    const predictions = Array.isArray(body.predictions) ? body.predictions : [];
    if (!nickname) return json(400, { error: 'Enter a nickname' });
    if (!predictions.length) return json(400, { error: 'No predictions selected' });
    const sb = client();
    const ids = [...new Set(predictions.map(p => p.match_id).filter(Boolean))];
    const selected = await sb.from('matches').select('id,round,kickoff').in('id', ids).eq('is_active', true);
    if (selected.error) throw selected.error;
    const matches = selected.data || [];
    if (matches.length !== ids.length) return json(400, { error: 'One or more selected matches could not be found.' });
    const rounds = [...new Set(matches.map(m => m.round))];
    if (rounds.length !== 1 || !/round\s*2/i.test(String(rounds[0] || ''))) return json(400, { error: 'Late picks are only open for Round 2.' });
    const round = rounds[0];
    const all = await sb.from('matches').select('id,round,kickoff').eq('round', round).eq('is_active', true).order('kickoff', { ascending: true });
    if (all.error) throw all.error;
    const now = Date.now();
    const openIds = (all.data || []).filter(m => {
      const t = new Date(m.kickoff).getTime();
      return t >= START && t > now;
    }).map(m => String(m.id));
    const submitted = new Set(ids.map(String));
    if (!openIds.length) return json(400, { error: 'There are no remaining Round 2 matches open.' });
    if ([...submitted].some(id => !openIds.includes(id))) return json(400, { error: 'One or more selected matches is not open.' });
    if (submitted.size !== openIds.length || !openIds.every(id => submitted.has(id))) return json(400, { error: 'Please predict every remaining open Round 2 match.' });
    const bad = predictions.find(p => !['home', 'draw', 'away'].includes(p.predicted_winner) || !okScore(p.home_score) || !okScore(p.away_score));
    if (bad) return json(400, { error: 'Please choose a winner/draw and enter both scores for every remaining match.' });
    const found = await sb.from('players').select('*').ilike('nickname', nickname).maybeSingle();
    if (found.error) throw found.error;
    let player = found.data;
    if (!player) {
      const made = await sb.from('players').insert({ nickname }).select().single();
      if (made.error) throw made.error;
      player = made.data;
    }
    const exists = await sb.from('predictions').select('id,match_id').eq('player_id', player.id).in('match_id', openIds);
    if (exists.error) throw exists.error;
    if ((exists.data || []).length) return json(400, { error: 'You already locked one or more remaining Round 2 picks.' });
    const rows = predictions.map(p => ({ player_id: player.id, match_id: p.match_id, predicted_winner: p.predicted_winner, home_score: p.home_score, away_score: p.away_score, updated_at: new Date().toISOString() }));
    const saved = await sb.from('predictions').insert(rows);
    if (saved.error) throw saved.error;
    return json(200, { ok: true, saved: rows.length, round });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

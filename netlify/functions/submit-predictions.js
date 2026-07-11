const { client, json } = require('./_supabase');
const { hasExactMatchSet } = require('./_rounds');
const { normalizeKickoffs } = require('./_kuwait-kickoffs');

function normalizeNickname(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isValidScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 20;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    const body = JSON.parse(event.body || '{}');
    const nickname = normalizeNickname(body.nickname);
    const predictions = Array.isArray(body.predictions) ? body.predictions : [];

    if (!nickname) return json(400, { error: 'Enter a nickname' });
    if (!predictions.length) return json(400, { error: 'No predictions selected' });

    const sb = client();
    const ids = [...new Set(predictions.map(p => p.match_id).filter(Boolean))];

    if (ids.length !== predictions.length) {
      return json(400, { error: 'Each match can only be predicted once.' });
    }

    const { data: rawSelectedMatches, error: mErr } = await sb
      .from('matches')
      .select('id,round,home,away,kickoff')
      .in('id', ids)
      .eq('is_active', true);

    if (mErr) throw mErr;
    const selectedMatches = normalizeKickoffs(rawSelectedMatches || []);
    if (!selectedMatches || selectedMatches.length !== ids.length) {
      return json(400, { error: 'One or more selected matches could not be found.' });
    }

    const rounds = [...new Set(selectedMatches.map(m => m.round))];
    if (rounds.length !== 1) {
      return json(400, { error: 'Please lock in one round at a time.' });
    }

    const round = rounds[0];

    const { data: rawRoundMatches, error: rErr } = await sb
      .from('matches')
      .select('id,round,home,away,kickoff')
      .eq('round', round)
      .eq('is_active', true)
      .order('kickoff', { ascending: true });

    if (rErr) throw rErr;
    const roundMatches = normalizeKickoffs(rawRoundMatches || [])
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

    const openMatches = roundMatches.filter(m => new Date(m.kickoff).getTime() > Date.now());
    const openIds = openMatches.map(m => String(m.id));
    const submittedIds = new Set(ids.map(String));

    if (!openIds.length) {
      return json(400, {
        error: 'This round is locked. There are no matches left open for picks.'
      });
    }

    const invalidMatch = [...submittedIds].find(id => !openIds.includes(id));
    if (invalidMatch) {
      return json(400, {
        error: 'One or more selected matches has already kicked off or does not belong to this round.'
      });
    }

    if (!hasExactMatchSet([...submittedIds], openIds)) {
      return json(400, {
        error: `Please predict every remaining open match in ${round} before locking in.`
      });
    }

    const invalid = predictions.find(p => {
      return !['home', 'draw', 'away'].includes(p.predicted_winner) ||
        !isValidScore(p.home_score) ||
        !isValidScore(p.away_score);
    });

    if (invalid) {
      return json(400, {
        error: 'Please choose a winner/draw and enter both scores for every match.'
      });
    }

    const { data: existingPlayer, error: findErr } = await sb
      .from('players')
      .select('*')
      .ilike('nickname', nickname)
      .maybeSingle();

    if (findErr) throw findErr;

    let player = existingPlayer;

    if (!player) {
      const { data: newPlayer, error: createErr } = await sb
        .from('players')
        .insert({ nickname })
        .select()
        .single();

      if (createErr) throw createErr;
      player = newPlayer;
    }

    const { data: existingPredictions, error: existingErr } = await sb
      .from('predictions')
      .select('id,match_id')
      .eq('player_id', player.id)
      .in('match_id', openIds);

    if (existingErr) throw existingErr;

    if (existingPredictions && existingPredictions.length > 0) {
      return json(400, {
        error: `You have already locked in one or more picks for ${round}. Picks are final once submitted.`
      });
    }

    const rows = predictions.map(p => ({
      player_id: player.id,
      match_id: p.match_id,
      predicted_winner: p.predicted_winner,
      home_score: p.home_score,
      away_score: p.away_score,
      updated_at: new Date().toISOString()
    }));

    const { error } = await sb
      .from('predictions')
      .insert(rows);

    if (error) throw error;

    return json(200, { ok: true, saved: rows.length, round });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

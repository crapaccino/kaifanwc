const { client, json } = require('./_supabase');

const CATEGORIES = ['winner', 'potm', 'golden_boot', 'golden_glove'];

function normalizeNickname(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function cleanPick(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function isRoundTwo(round) {
  return String(round || '').toLowerCase().includes('round 2');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    const body = JSON.parse(event.body || '{}');
    const nickname = normalizeNickname(body.nickname);
    const picks = body.picks || {};

    if (!nickname) return json(400, { error: 'Enter your name first.' });

    const missing = CATEGORIES.find(c => !cleanPick(picks[c]));
    if (missing) return json(400, { error: 'Please choose all bonus predictions before locking in.' });

    const sb = client();

    const { data: roundTwoMatches, error: deadlineErr } = await sb
      .from('matches')
      .select('kickoff,round')
      .eq('is_active', true)
      .order('kickoff', { ascending: true });

    if (deadlineErr) throw deadlineErr;

    const firstRoundTwo = (roundTwoMatches || []).find(m => isRoundTwo(m.round));
    if (firstRoundTwo && Date.now() >= new Date(firstRoundTwo.kickoff).getTime()) {
      return json(400, { error: 'Bonus predictions are locked. The deadline was the first kickoff of Round 2.' });
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

    const rows = CATEGORIES.map(category => ({
      player_id: player.id,
      category,
      pick: cleanPick(picks[category])
    }));

    const { error } = await sb
      .from('bonus_predictions')
      .upsert(rows, { onConflict: 'player_id,category' });

    if (error) throw error;

    return json(200, { ok: true, saved: rows.length, bonus_predictions: rows });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
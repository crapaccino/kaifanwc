const { client, json } = require('./_supabase');

const CATEGORIES = ['winner', 'potm', 'golden_boot', 'golden_glove'];

function normalizeNickname(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function cleanPick(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    const body = JSON.parse(event.body || '{}');
    const nickname = normalizeNickname(body.nickname);
    const picks = body.picks || {};

    if (!nickname) return json(400, { error: 'Enter your name first.' });

    const missing = CATEGORIES.find(c => !cleanPick(picks[c]));
    if (missing) return json(400, { error: 'Please choose all bonus predictions before saving.' });

    const sb = client();

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

    const { error: deleteErr } = await sb
      .from('bonus_predictions')
      .delete()
      .eq('player_id', player.id);

    if (deleteErr) throw deleteErr;

    const rows = CATEGORIES.map(category => ({
      player_id: player.id,
      category,
      pick: cleanPick(picks[category])
    }));

    const { error: insertErr } = await sb
      .from('bonus_predictions')
      .insert(rows);

    if (insertErr) throw insertErr;

    return json(200, { ok: true, saved: rows.length, bonus_predictions: rows });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

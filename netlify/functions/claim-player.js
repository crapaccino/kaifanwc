const { client, json } = require('./_supabase');

function normalizeNickname(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    const body = JSON.parse(event.body || '{}');
    const nickname = normalizeNickname(body.nickname);

    if (!nickname) return json(400, { error: 'Enter your name first.' });

    const sb = client();
    const { data: existing, error: findErr } = await sb
      .from('players')
      .select('*')
      .ilike('nickname', nickname)
      .limit(1);

    if (findErr) throw findErr;

    const player = existing && existing[0];
    if (player) {
      return json(200, { ok: true, player, existing: true, logged_in: true });
    }

    const { data: created, error: createErr } = await sb
      .from('players')
      .insert({ nickname })
      .select()
      .single();

    if (createErr) throw createErr;

    return json(200, { ok: true, player: created, existing: false, logged_in: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

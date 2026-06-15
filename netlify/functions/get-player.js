const { client, json } = require('./_supabase');
exports.handler = async (event) => {
  try {
    const nickname = (event.queryStringParameters.nickname || '').trim();
    if (!nickname) return json(400, { error: 'Nickname required' });
    const sb = client();
    const { data: player, error } = await sb.from('players').select('*').eq('nickname', nickname).maybeSingle();
    if (error) throw error;
    if (!player) return json(200, { player: null, predictions: [] });
    const { data: predictions, error: pErr } = await sb.from('predictions').select('*').eq('player_id', player.id);
    if (pErr) throw pErr;
    return json(200, { player, predictions });
  } catch (e) { return json(500, { error: e.message }); }
};

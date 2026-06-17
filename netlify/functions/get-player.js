const { client, json } = require('./_supabase');

function normalizeNickname(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

exports.handler = async (event) => {
  try {
    const nickname = normalizeNickname(event.queryStringParameters.nickname);
    if (!nickname) return json(400, { error: 'Nickname required' });

    const sb = client();
    const playerRes = await sb
      .from('players')
      .select('*')
      .ilike('nickname', nickname)
      .maybeSingle();

    if (playerRes.error) throw playerRes.error;
    const player = playerRes.data;
    if (!player) return json(200, { player: null, predictions: [], bonus_predictions: [] });

    const predRes = await sb.from('predictions').select('*').eq('player_id', player.id);
    if (predRes.error) throw predRes.error;

    const bonusRes = await sb.from('bonus_predictions').select('*').eq('player_id', player.id);
    if (bonusRes.error) throw bonusRes.error;

    return json(200, { player, predictions: predRes.data || [], bonus_predictions: bonusRes.data || [] });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
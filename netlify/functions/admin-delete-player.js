const { client, json, requireAdmin } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    requireAdmin(event);

    const body = JSON.parse(event.body || '{}');
    const playerId = body.player_id;
    const nickname = String(body.nickname || '').trim().toLowerCase();

    if (!playerId && !nickname) return json(400, { error: 'Player ID or nickname required' });

    const sb = client();
    let player;

    if (playerId) {
      const { data, error } = await sb.from('players').select('*').eq('id', playerId).single();
      if (error) throw error;
      player = data;
    } else {
      const { data, error } = await sb.from('players').select('*').eq('nickname', nickname).single();
      if (error) throw error;
      player = data;
    }

    if (!player || !player.id) return json(404, { error: 'Player not found' });

    const [predictionsRes, bonusRes, playerRes] = await Promise.all([
      sb.from('predictions').delete().eq('player_id', player.id),
      sb.from('bonus_predictions').delete().eq('player_id', player.id),
      sb.from('players').delete().eq('id', player.id)
    ]);

    if (predictionsRes.error || bonusRes.error || playerRes.error) {
      throw (predictionsRes.error || bonusRes.error || playerRes.error);
    }

    return json(200, { ok: true, deleted_player: player.nickname });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

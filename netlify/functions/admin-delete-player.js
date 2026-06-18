const { client, json, requireAdmin } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    requireAdmin(event);

    const body = JSON.parse(event.body || '{}');
    const playerId = body.player_id;
    const nickname = String(body.nickname || '').trim();

    if (!playerId && !nickname) return json(400, { error: 'Player ID or nickname required' });

    const sb = client();
    let players = [];

    if (playerId) {
      const { data, error } = await sb.from('players').select('*').eq('id', playerId);
      if (error) throw error;
      players = data || [];
    } else {
      const { data, error } = await sb.from('players').select('*').ilike('nickname', nickname);
      if (error) throw error;
      players = data || [];
    }

    if (!players.length) return json(404, { error: 'Player not found' });

    const playerIds = players.map(player => player.id).filter(Boolean);
    const deletedNames = players.map(player => player.nickname).filter(Boolean);

    const [predictionsRes, bonusRes, playerRes] = await Promise.all([
      sb.from('predictions').delete().in('player_id', playerIds),
      sb.from('bonus_predictions').delete().in('player_id', playerIds),
      sb.from('players').delete().in('id', playerIds)
    ]);

    if (predictionsRes.error || bonusRes.error || playerRes.error) {
      throw (predictionsRes.error || bonusRes.error || playerRes.error);
    }

    return json(200, { ok: true, deleted_count: players.length, deleted_players: deletedNames });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

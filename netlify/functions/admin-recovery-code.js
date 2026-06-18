const { client, json, requireAdmin } = require('./_supabase');
const { normalizeNickname, recoveryCodeForPlayer } = require('./_recovery');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    requireAdmin(event);
    const body = JSON.parse(event.body || '{}');
    const nickname = normalizeNickname(body.nickname);
    if (!nickname) return json(400, { error: 'Nickname required' });

    const sb = client();
    const { data: players, error } = await sb
      .from('players')
      .select('id,nickname')
      .ilike('nickname', nickname);

    if (error) throw error;
    if (!players || !players.length) return json(404, { error: 'Player not found' });
    if (players.length > 1) return json(400, { error: 'Multiple players have this nickname. Delete duplicates first or rename one of them.' });

    const player = players[0];
    return json(200, { ok: true, nickname: player.nickname, recovery_code: recoveryCodeForPlayer(player) });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

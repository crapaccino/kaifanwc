const { client, json } = require('./_supabase');
const { normalizeNickname, recoveryCodeForPlayer, codesMatch } = require('./_recovery');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    const body = JSON.parse(event.body || '{}');
    const nickname = normalizeNickname(body.nickname);
    const code = String(body.code || '').trim();
    if (!nickname || !code) return json(400, { error: 'Nickname and recovery code required' });

    const sb = client();
    const { data: players, error } = await sb
      .from('players')
      .select('id,nickname')
      .ilike('nickname', nickname);

    if (error) throw error;
    if (!players || !players.length) return json(404, { error: 'Player not found' });
    if (players.length > 1) return json(400, { error: 'Multiple players have this nickname. Ask the admin to remove duplicate accounts first.' });

    const player = players[0];
    const expected = recoveryCodeForPlayer(player);
    if (!codesMatch(code, expected)) return json(401, { error: 'Recovery code is wrong' });

    return json(200, { ok: true, nickname: player.nickname });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

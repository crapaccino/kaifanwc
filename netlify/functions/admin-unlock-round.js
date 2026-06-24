const { client, json, requireAdmin } = require('./_supabase');

function normalizeNickname(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    requireAdmin(event);

    const body = JSON.parse(event.body || '{}');
    const nickname = normalizeNickname(body.nickname);
    const round = String(body.round || '').trim();

    if (!nickname) return json(400, { error: 'Player name required' });
    if (!round) return json(400, { error: 'Round required' });

    const sb = client();

    const { data: player, error: playerErr } = await sb
      .from('players')
      .select('id,nickname')
      .ilike('nickname', nickname)
      .maybeSingle();

    if (playerErr) throw playerErr;
    if (!player) return json(404, { error: 'Player not found' });

    const { data: roundMatches, error: matchErr } = await sb
      .from('matches')
      .select('id,round,kickoff')
      .eq('round', round)
      .eq('is_active', true)
      .order('kickoff', { ascending: true });

    if (matchErr) throw matchErr;
    if (!roundMatches || !roundMatches.length) {
      return json(404, { error: 'Round not found or has no active matches' });
    }

    const deadline = new Date(roundMatches[0].kickoff).getTime();
    if (!Number.isFinite(deadline) || Date.now() >= deadline) {
      return json(400, { error: 'This round has already started, so picks cannot be unlocked.' });
    }

    const matchIds = roundMatches.map(m => m.id);
    const { data: deletedRows, error: deleteErr } = await sb
      .from('predictions')
      .delete()
      .eq('player_id', player.id)
      .in('match_id', matchIds)
      .select('id');

    if (deleteErr) throw deleteErr;

    return json(200, {
      ok: true,
      nickname: player.nickname,
      round,
      deleted: (deletedRows || []).length
    });
  } catch (e) {
    return json(401, { error: e.message });
  }
};

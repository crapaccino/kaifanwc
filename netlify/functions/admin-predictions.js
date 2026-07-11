const { client, json, requireAdmin } = require('./_supabase');
const { scorePrediction } = require('./_scoring');

async function fetchAll(queryFactory, pageSize = 1000) {
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory()
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'GET only' });

  try {
    requireAdmin(event);
    const sb = client();

    const [matchesRes, playersRes, predictions] = await Promise.all([
      sb.from('matches').select('*').eq('is_active', true).order('kickoff', { ascending: true }),
      sb.from('players').select('*').order('nickname'),
      fetchAll(() => sb.from('predictions').select('*').order('created_at', { ascending: true }))
    ]);

    if (matchesRes.error || playersRes.error) {
      throw (matchesRes.error || playersRes.error);
    }

    const matches = matchesRes.data || [];
    const players = playersRes.data || [];

    const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));
    const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

    const rows = predictions
      .map(pred => {
        const match = matchMap[pred.match_id];
        const player = playerMap[pred.player_id];
        if (!match || !player) return null;

        const predictedWinner = pred.predicted_winner === 'home'
          ? match.home
          : pred.predicted_winner === 'away'
            ? match.away
            : 'Draw';

        return {
          prediction_id: pred.id,
          player_id: player.id,
          match_id: match.id,
          nickname: player.nickname,
          round: match.round,
          group_name: match.group_name,
          kickoff: match.kickoff,
          home: match.home,
          away: match.away,
          predicted_winner: predictedWinner,
          predicted_winner_key: pred.predicted_winner,
          predicted_home_score: pred.home_score,
          predicted_away_score: pred.away_score,
          actual_home_score: match.home_score,
          actual_away_score: match.away_score,
          points: scorePrediction(pred, match),
          locked_at: pred.created_at || pred.updated_at || null
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        return a.round.localeCompare(b.round) ||
          new Date(a.kickoff) - new Date(b.kickoff) ||
          a.nickname.localeCompare(b.nickname);
      });

    return json(200, { rows });
  } catch (e) {
    return json(401, { error: e.message });
  }
};

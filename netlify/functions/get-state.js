const { client, json } = require('./_supabase');
const { scorePrediction } = require('./_scoring');
const { normalizeKickoffs } = require('./_kuwait-kickoffs');
const { bonusResultsFromEnv, scoreBonusPicks } = require('./_bonus-scoring');
const { finalFixture } = require('./_final-fixture');

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

exports.handler = async () => {
  try {
    const sb = client();
    const { error: finalError } = await sb
      .from('matches')
      .upsert(finalFixture(), { onConflict: 'id' });
    if (finalError) throw finalError;

    const [matchesRes, playersRes, predictions, bonusRes] = await Promise.all([
      sb.from('matches').select('*').eq('is_active', true).order('kickoff', { ascending: true }),
      sb.from('players').select('*').order('nickname'),
      fetchAll(() => sb.from('predictions').select('*').order('created_at', { ascending: true })),
      sb.from('bonus_predictions').select('*')
    ]);

    if (matchesRes.error || playersRes.error || bonusRes.error) {
      throw (matchesRes.error || playersRes.error || bonusRes.error);
    }

    const matches = normalizeKickoffs(matchesRes.data || []).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    const players = playersRes.data || [];
    const bonusRows = bonusRes.data || [];
    const bonusResults = bonusResultsFromEnv();

    const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));
    const bonusByPlayer = {};
    bonusRows.forEach(b => {
      if (!bonusByPlayer[b.player_id]) bonusByPlayer[b.player_id] = {};
      bonusByPlayer[b.player_id][b.category] = b.pick;
    });

    const leaderboard = players.map(p => {
      const mine = predictions.filter(x => x.player_id === p.id);
      const round_predictions = mine.reduce((counts, prediction) => {
        const round = matchMap[prediction.match_id]?.round;
        if (round) counts[round] = (counts[round] || 0) + 1;
        return counts;
      }, {});
      const matchPoints = mine.reduce((sum, x) => sum + scorePrediction(x, matchMap[x.match_id] || {}), 0);
      const bonusPoints = scoreBonusPicks(bonusByPlayer[p.id] || {}, bonusResults);
      return {
        player_id: p.id,
        nickname: p.nickname,
        predictions: mine.length,
        round_predictions,
        round2_predictions: round_predictions['Group Stage - Round 2'] || 0,
        round3_predictions: round_predictions['Group Stage - Round 3'] || 0,
        r32_predictions: round_predictions['Round of 32'] || 0,
        r32_locked: (round_predictions['Round of 32'] || 0) > 0,
        points: matchPoints + bonusPoints,
        match_points: matchPoints,
        bonus_points: bonusPoints,
        bonus: bonusByPlayer[p.id] || {}
      };
    }).sort((a,b)=>b.points-a.points || b.predictions-a.predictions || a.nickname.localeCompare(b.nickname));

    const bonus_predictions = bonusRows.map(b => {
      const player = players.find(p => p.id === b.player_id);
      return { nickname: player ? player.nickname : '', category: b.category, pick: b.pick, created_at: b.created_at };
    });

    return json(200, { matches, leaderboard, bonus_predictions, bonus_results: bonusResults });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

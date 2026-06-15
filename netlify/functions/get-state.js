const { client, json, scorePrediction } = require('./_supabase');
exports.handler = async () => {
  try {
    const sb = client();
    const [{ data: matches, error: mErr }, { data: players, error: pErr }, { data: predictions, error: prErr }] = await Promise.all([
      sb.from('matches').select('*').eq('is_active', true).order('kickoff', { ascending: true }),
      sb.from('players').select('*').order('nickname'),
      sb.from('predictions').select('*')
    ]);
    if (mErr || pErr || prErr) throw (mErr || pErr || prErr);
    const matchMap = Object.fromEntries(matches.map(m => [m.id, m]));
    const leaderboard = players.map(p => {
      const mine = predictions.filter(x => x.player_id === p.id);
      return {
        nickname: p.nickname,
        predictions: mine.length,
        points: mine.reduce((sum, x) => sum + scorePrediction(x, matchMap[x.match_id] || {}), 0)
      };
    }).sort((a,b)=>b.points-a.points || b.predictions-a.predictions || a.nickname.localeCompare(b.nickname));
    return json(200, { matches, leaderboard });
  } catch (e) { return json(500, { error: e.message }); }
};

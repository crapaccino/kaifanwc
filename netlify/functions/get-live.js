const { client, json } = require('./_supabase');

function predictedWinnerLabel(prediction, match) {
  if (prediction === 'home') return match.home;
  if (prediction === 'away') return match.away;
  return 'Draw';
}

exports.handler = async () => {
  try {
    const sb = client();
    const now = Date.now();

    const { data: matches, error: mErr } = await sb
      .from('matches')
      .select('*')
      .eq('is_active', true)
      .order('kickoff', { ascending: true });

    if (mErr) throw mErr;

    const started = (matches || []).filter(m => new Date(m.kickoff).getTime() <= now);
    const match = started[started.length - 1] || null;

    if (!match) {
      return json(200, { match: null, predictions: [], summary: null });
    }

    const [{ data: predictions, error: prErr }, { data: players, error: pErr }] = await Promise.all([
      sb.from('predictions').select('*').eq('match_id', match.id),
      sb.from('players').select('*')
    ]);

    if (prErr || pErr) throw (prErr || pErr);

    const playerMap = Object.fromEntries((players || []).map(p => [p.id, p]));
    const total = (predictions || []).length;
    const counts = { home: 0, draw: 0, away: 0 };

    const rows = (predictions || [])
      .map(p => {
        counts[p.predicted_winner] = (counts[p.predicted_winner] || 0) + 1;
        return {
          nickname: playerMap[p.player_id]?.nickname || 'Unknown',
          predicted_winner: p.predicted_winner,
          predicted_winner_label: predictedWinnerLabel(p.predicted_winner, match),
          home_score: p.home_score,
          away_score: p.away_score
        };
      })
      .sort((a, b) => a.nickname.localeCompare(b.nickname));

    const pct = key => total ? Math.round((counts[key] / total) * 100) : 0;

    return json(200, {
      match,
      predictions: rows,
      summary: {
        total,
        home: { label: match.home, count: counts.home, percent: pct('home') },
        draw: { label: 'Draw', count: counts.draw, percent: pct('draw') },
        away: { label: match.away, count: counts.away, percent: pct('away') }
      }
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
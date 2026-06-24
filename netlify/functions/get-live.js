const { client, json } = require('./_supabase');

function predictedWinnerLabel(prediction, match) {
  if (prediction === 'home') return match.home;
  if (prediction === 'away') return match.away;
  return 'Draw';
}

function buildGamePayload(match, predictions, playerMap) {
  const matchPredictions = (predictions || []).filter(p => String(p.match_id) === String(match.id));
  const total = matchPredictions.length;
  const counts = { home: 0, draw: 0, away: 0 };

  const rows = matchPredictions
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

  return {
    match,
    predictions: rows,
    summary: {
      total,
      home: { label: match.home, count: counts.home, percent: pct('home') },
      draw: { label: 'Draw', count: counts.draw, percent: pct('draw') },
      away: { label: match.away, count: counts.away, percent: pct('away') }
    }
  };
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
    const latest = started[started.length - 1] || null;

    if (!latest) {
      return json(200, { match: null, predictions: [], summary: null, games: [] });
    }

    const latestKickoff = new Date(latest.kickoff).getTime();
    const simultaneousMatches = started.filter(m => new Date(m.kickoff).getTime() === latestKickoff);
    const matchIds = simultaneousMatches.map(m => m.id);

    const [{ data: predictions, error: prErr }, { data: players, error: pErr }] = await Promise.all([
      sb.from('predictions').select('*').in('match_id', matchIds),
      sb.from('players').select('*')
    ]);

    if (prErr || pErr) throw (prErr || pErr);

    const playerMap = Object.fromEntries((players || []).map(p => [p.id, p]));
    const games = simultaneousMatches.map(match => buildGamePayload(match, predictions, playerMap));
    const primary = games[0] || { match: latest, predictions: [], summary: null };

    return json(200, {
      match: primary.match,
      predictions: primary.predictions,
      summary: primary.summary,
      games
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
const { client, json, requireAdmin } = require('./_supabase');

function isValidScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 20;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    requireAdmin(event);

    const body = JSON.parse(event.body || '{}');
    const predictionId = body.prediction_id;
    const predictedWinner = body.predicted_winner;
    const homeScore = Number(body.home_score);
    const awayScore = Number(body.away_score);

    if (!predictionId) return json(400, { error: 'Prediction ID required' });
    if (!['home', 'draw', 'away'].includes(predictedWinner)) {
      return json(400, { error: 'Predicted winner must be home, draw, or away' });
    }
    if (!isValidScore(homeScore) || !isValidScore(awayScore)) {
      return json(400, { error: 'Scores must be whole numbers from 0 to 20' });
    }

    const sb = client();
    const { data, error } = await sb
      .from('predictions')
      .update({
        predicted_winner: predictedWinner,
        home_score: homeScore,
        away_score: awayScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', predictionId)
      .select()
      .single();

    if (error) throw error;
    return json(200, { ok: true, prediction: data });
  } catch (e) {
    return json(401, { error: e.message });
  }
};

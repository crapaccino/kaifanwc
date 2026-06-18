function winnerOfScore(homeScore, awayScore) {
  if (homeScore === null || awayScore === null || homeScore === undefined || awayScore === undefined) return null;
  if (Number(homeScore) > Number(awayScore)) return 'home';
  if (Number(awayScore) > Number(homeScore)) return 'away';
  return 'draw';
}

function scorePrediction(pred, match) {
  const actual = winnerOfScore(match.home_score, match.away_score);
  if (!actual) return 0;

  const exactScore = Number(pred.home_score) === Number(match.home_score) &&
    Number(pred.away_score) === Number(match.away_score);

  if (exactScore) return 5;
  return pred.predicted_winner === actual ? 3 : 0;
}

module.exports = { scorePrediction, winnerOfScore };

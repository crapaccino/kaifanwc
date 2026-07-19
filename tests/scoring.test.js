const test = require('node:test');
const assert = require('node:assert/strict');
const { scorePrediction } = require('../netlify/functions/_scoring');
const { bonusResultsFromEnv, scoreBonusPicks } = require('../netlify/functions/_bonus-scoring');

test('the final awards 10 for an exact score and 4 for the correct result', () => {
  const match = { round: 'Final', home_score: 2, away_score: 1 };
  assert.equal(scorePrediction({ home_score: 2, away_score: 1, predicted_winner: 'home' }, match), 10);
  assert.equal(scorePrediction({ home_score: 3, away_score: 1, predicted_winner: 'home' }, match), 4);
});

test('bonus picks score all four categories and support field picks', () => {
  const picks = {
    winner: 'Spain',
    potm: 'Any Other Player',
    golden_boot: 'Lionel Messi',
    golden_glove: 'Any Other Goalkeeper'
  };
  const results = {
    winner: 'Spain',
    potm: 'Rodri',
    golden_boot: 'Lionel Messi',
    golden_glove: 'David Raya'
  };
  assert.equal(scoreBonusPicks(picks, results), 43);
});

test('official tournament results are available by default', () => {
  assert.deepEqual(bonusResultsFromEnv({}), {
    winner: 'Spain',
    potm: 'Rodri',
    golden_boot: 'Kylian Mbappe',
    golden_glove: 'Unai Simon'
  });
});

const BONUS_POINTS = {
  winner: 15,
  potm: 10,
  golden_boot: 10,
  golden_glove: 8
};

const FIELD_PICKS = {
  winner: 'Any Other Team',
  potm: 'Any Other Player',
  golden_boot: 'Any Other Player',
  golden_glove: 'Any Other Goalkeeper'
};

const LISTED_PICKS = {
  winner: ['France', 'England', 'Spain', 'Argentina', 'Brazil'],
  potm: ['Kylian Mbappe', 'Lamine Yamal', 'Harry Kane', 'Lionel Messi', 'Michael Olise'],
  golden_boot: ['Kylian Mbappe', 'Harry Kane', 'Erling Haaland', 'Lionel Messi', 'Kai Havertz'],
  golden_glove: ['Mike Maignan', 'Emiliano Martinez', 'Jordan Pickford', 'Unai Simon', 'Alisson Becker']
};

function clean(value) {
  return String(value || '').trim().toLocaleLowerCase('en');
}

function bonusResultsFromEnv(env = process.env) {
  return {
    winner: env.BONUS_WINNER || '',
    potm: env.BONUS_POTM || '',
    golden_boot: env.BONUS_GOLDEN_BOOT || '',
    golden_glove: env.BONUS_GOLDEN_GLOVE || ''
  };
}

function isCorrectBonusPick(category, pick, result) {
  if (!BONUS_POINTS[category] || !clean(pick) || !clean(result)) return false;
  if (clean(pick) === clean(result)) return true;
  return clean(pick) === clean(FIELD_PICKS[category]) &&
    !LISTED_PICKS[category].some(listed => clean(listed) === clean(result));
}

function scoreBonusPicks(picks = {}, results = {}) {
  return Object.keys(BONUS_POINTS).reduce((total, category) =>
    total + (isCorrectBonusPick(category, picks[category], results[category]) ? BONUS_POINTS[category] : 0), 0);
}

module.exports = { BONUS_POINTS, bonusResultsFromEnv, isCorrectBonusPick, scoreBonusPicks };

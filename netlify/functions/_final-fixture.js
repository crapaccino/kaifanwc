const ROUND = 'Final';

const FINAL_FIXTURE = {
  id: '400021543',
  round: ROUND,
  group_name: 'F',
  home: 'Spain',
  away: 'Argentina',
  kickoff: '2026-07-19T19:00:00.000Z',
  home_score: 1,
  away_score: 0,
  is_active: true
};

function finalFixture() {
  return { ...FINAL_FIXTURE };
}

module.exports = { ROUND, finalFixture };

const ROUND = 'Semi-finals';

// Kickoffs are stored in UTC. Kuwait is UTC+3, so both matches display at 22:00.
const SEMIFINAL_FIXTURES = [
  {
    id: '5001',
    round: ROUND,
    group_name: 'SF',
    home: 'France',
    away: 'Spain',
    kickoff: '2026-07-14T19:00:00.000Z',
    is_active: true
  },
  {
    id: '5002',
    round: ROUND,
    group_name: 'SF',
    home: 'England',
    away: 'Argentina',
    kickoff: '2026-07-15T19:00:00.000Z',
    is_active: true
  }
];

function semifinalFixtures() {
  return SEMIFINAL_FIXTURES.map(match => ({ ...match }));
}

module.exports = { ROUND, semifinalFixtures };

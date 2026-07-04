const ROUND = 'Round of 16';
const PENDING_OPPONENT = 'Winner of Colombia vs Ghana';

function round16Fixtures(lastWinner = '') {
  const finalOpponent = ['Colombia', 'Ghana'].includes(String(lastWinner).trim())
    ? String(lastWinner).trim()
    : PENDING_OPPONENT;

  return [
    { id: '1601', round: ROUND, group_name: 'R16', home: 'Canada', away: 'Morocco', kickoff: '2026-07-04T17:00:00.000Z', is_active: true },
    { id: '1602', round: ROUND, group_name: 'R16', home: 'Paraguay', away: 'France', kickoff: '2026-07-04T21:00:00.000Z', is_active: true },
    { id: '1603', round: ROUND, group_name: 'R16', home: 'Brazil', away: 'Norway', kickoff: '2026-07-05T20:00:00.000Z', is_active: true },
    { id: '1604', round: ROUND, group_name: 'R16', home: 'Mexico', away: 'England', kickoff: '2026-07-06T00:00:00.000Z', is_active: true },
    { id: '1605', round: ROUND, group_name: 'R16', home: 'Portugal', away: 'Spain', kickoff: '2026-07-06T19:00:00.000Z', is_active: true },
    { id: '1606', round: ROUND, group_name: 'R16', home: 'United States', away: 'Belgium', kickoff: '2026-07-07T00:00:00.000Z', is_active: true },
    { id: '1607', round: ROUND, group_name: 'R16', home: 'Argentina', away: 'Egypt', kickoff: '2026-07-07T16:00:00.000Z', is_active: true },
    { id: '1608', round: ROUND, group_name: 'R16', home: 'Switzerland', away: finalOpponent, kickoff: '2026-07-07T20:00:00.000Z', is_active: true }
  ];
}

module.exports = { ROUND, PENDING_OPPONENT, round16Fixtures };

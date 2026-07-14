const test = require('node:test');
const assert = require('node:assert/strict');
const { semifinalFixtures } = require('../netlify/functions/_semifinal-fixtures');

function kuwaitDateTime(value) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuwait',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(value));
}

test('semifinal fixtures contain the two quarter-final winner pairings', () => {
  const fixtures = semifinalFixtures();
  assert.equal(fixtures.length, 2);
  assert.deepEqual(
    fixtures.map(match => [match.home, match.away]),
    [['France', 'Spain'], ['England', 'Argentina']]
  );
  assert.ok(fixtures.every(match => match.round === 'Semi-finals' && match.group_name === 'SF'));
});

test('both semifinals display at 22:00 Kuwait time on their official dates', () => {
  const fixtures = semifinalFixtures();
  assert.deepEqual(
    fixtures.map(match => kuwaitDateTime(match.kickoff)),
    ['14/07/2026, 22:00', '15/07/2026, 22:00']
  );
});

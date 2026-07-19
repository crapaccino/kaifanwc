const test = require('node:test');
const assert = require('node:assert/strict');
const { finalFixture } = require('../netlify/functions/_final-fixture');

test('final fixture is Spain vs Argentina at 22:00 Kuwait time', () => {
  const match = finalFixture();
  assert.equal(match.round, 'Final');
  assert.equal(match.group_name, 'F');
  assert.deepEqual([match.home, match.away], ['Spain', 'Argentina']);
  assert.equal(match.kickoff, '2026-07-19T19:00:00.000Z');
  assert.deepEqual([match.home_score, match.away_score], [1, 0]);
});

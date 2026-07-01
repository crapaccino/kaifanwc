const test = require('node:test');
const assert = require('node:assert/strict');
const { roundDeadline, isRoundOpen, hasExactMatchSet } = require('../netlify/functions/_rounds');

const matches = [
  { id: 'later', kickoff: '2026-07-02T19:00:00.000Z' },
  { id: 'first', kickoff: '2026-07-02T16:00:00.000Z' }
];

test('round deadline is the first kickoff regardless of input order', () => {
  assert.equal(roundDeadline(matches), Date.parse('2026-07-02T16:00:00.000Z'));
});

test('round is open before the first kickoff and locked at kickoff', () => {
  assert.equal(isRoundOpen(matches, Date.parse('2026-07-02T15:59:59.999Z')), true);
  assert.equal(isRoundOpen(matches, Date.parse('2026-07-02T16:00:00.000Z')), false);
});

test('submission must contain every round match and no extras', () => {
  assert.equal(hasExactMatchSet(['1', '2'], [1, 2]), true);
  assert.equal(hasExactMatchSet(['1'], [1, 2]), false);
  assert.equal(hasExactMatchSet(['1', '2', '3'], [1, 2]), false);
});

test('rounds without a valid kickoff remain closed', () => {
  assert.equal(roundDeadline([{ kickoff: 'invalid' }]), null);
  assert.equal(isRoundOpen([], 0), false);
});

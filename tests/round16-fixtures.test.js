const test = require('node:test');
const assert = require('node:assert/strict');
const { PENDING_OPPONENT, round16Fixtures } = require('../netlify/functions/_round16-fixtures');

test('Round of 16 contains eight uniquely identified fixtures', () => {
  const fixtures = round16Fixtures();
  assert.equal(fixtures.length, 8);
  assert.equal(new Set(fixtures.map(match => match.id)).size, 8);
  assert.ok(fixtures.every(match => match.round === 'Round of 16' && match.group_name === 'R16'));
});

test('first kickoff is 20:00 Kuwait time on 4 July', () => {
  const firstKickoff = round16Fixtures()[0].kickoff;
  const kuwait = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuwait',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(firstKickoff));
  assert.equal(kuwait, '04/07/2026, 20:00');
});

test('pending final opponent can be safely replaced without changing match id', () => {
  assert.equal(round16Fixtures()[7].away, PENDING_OPPONENT);
  assert.equal(round16Fixtures('Colombia')[7].away, 'Colombia');
  assert.equal(round16Fixtures('Ghana')[7].away, 'Ghana');
  assert.equal(round16Fixtures('Ghana')[7].id, '1608');
});

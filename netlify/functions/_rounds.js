function roundDeadline(matches) {
  const kickoffs = (matches || [])
    .map(match => new Date(match.kickoff).getTime())
    .filter(Number.isFinite);

  return kickoffs.length ? Math.min(...kickoffs) : null;
}

function isRoundOpen(matches, now = Date.now()) {
  const deadline = roundDeadline(matches);
  return deadline !== null && now < deadline;
}

function hasExactMatchSet(submittedIds, roundIds) {
  const submitted = new Set((submittedIds || []).map(String));
  const expected = new Set((roundIds || []).map(String));

  return submitted.size === expected.size && [...expected].every(id => submitted.has(id));
}

module.exports = { roundDeadline, isRoundOpen, hasExactMatchSet };

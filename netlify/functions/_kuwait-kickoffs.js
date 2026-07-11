const OFFICIAL_KICKOFFS_UTC = {
  // Round of 32
  'Canada|South Africa': '2026-06-28T19:00:00Z',
  'Brazil|Japan': '2026-06-29T17:00:00Z',
  'Germany|Paraguay': '2026-06-29T20:30:00Z',
  'Morocco|Netherlands': '2026-06-30T01:00:00Z',
  'Ivory Coast|Norway': '2026-06-30T17:00:00Z',
  'France|Sweden': '2026-06-30T21:00:00Z',
  'Ecuador|Mexico': '2026-07-01T01:00:00Z',
  'DR Congo|England': '2026-07-01T16:00:00Z',
  'Belgium|Senegal': '2026-07-01T20:00:00Z',
  'Bosnia and Herzegovina|United States': '2026-07-02T00:00:00Z',
  'Austria|Spain': '2026-07-02T19:00:00Z',
  'Croatia|Portugal': '2026-07-02T23:00:00Z',
  'Algeria|Switzerland': '2026-07-03T03:00:00Z',
  'Australia|Egypt': '2026-07-03T18:00:00Z',
  'Argentina|Cape Verde': '2026-07-03T22:00:00Z',
  'Colombia|Ghana': '2026-07-04T01:30:00Z',

  // Round of 16
  'Canada|Morocco': '2026-07-04T17:00:00Z',
  'France|Paraguay': '2026-07-04T21:00:00Z',
  'Brazil|Norway': '2026-07-05T20:00:00Z',
  'England|Mexico': '2026-07-06T00:00:00Z',
  'Portugal|Spain': '2026-07-06T19:00:00Z',
  'Belgium|United States': '2026-07-07T00:00:00Z',
  'Argentina|Egypt': '2026-07-07T16:00:00Z',
  'Switzerland|Winner of Colombia vs Ghana': '2026-07-07T20:00:00Z',
  'Colombia|Switzerland': '2026-07-07T20:00:00Z',
  'Ghana|Switzerland': '2026-07-07T20:00:00Z',

  // Quarter-finals
  'France|Morocco': '2026-07-09T20:00:00Z',
  'Belgium|Spain': '2026-07-10T19:00:00Z',
  'England|Norway': '2026-07-11T21:00:00Z',
  'Argentina|Switzerland': '2026-07-12T01:00:00Z',

  // Later rounds. Kept here so future tabs also display Kuwait time correctly.
  'Canada|TBD (Winner of 53452547)': '2026-07-04T17:00:00Z',
  'TBD (Winner of 53452541)|TBD (Winner of 53452543)': '2026-07-04T21:00:00Z',
  'Brazil|TBD (Winner of 53452561)': '2026-07-05T20:00:00Z',
  'TBD (Winner of 53452563)|TBD (Winner of 53452565)': '2026-07-06T00:00:00Z',
  'TBD (Winner of 53452549)|TBD (Winner of 53452551)': '2026-07-06T19:00:00Z',
  'TBD (Winner of 53452553)|TBD (Winner of 53452555)': '2026-07-07T00:00:00Z',
  'TBD (Winner of 53452569)|TBD (Winner of 53452503)': '2026-07-07T16:00:00Z',
  'TBD (Winner of 53452505)|TBD (Winner of 53452507)': '2026-07-07T20:00:00Z',
  'TBD (Winner of 53452509)|TBD (Winner of 53452511)': '2026-07-09T20:00:00Z',
  'TBD (Winner of 53452513)|TBD (Winner of 53452515)': '2026-07-10T19:00:00Z',
  'TBD (Winner of 53452517)|TBD (Winner of 53452519)': '2026-07-11T21:00:00Z',
  'TBD (Winner of 53452521)|TBD (Winner of 53452523)': '2026-07-12T01:00:00Z',
  'TBD (Winner of 53452525)|TBD (Winner of 53452527)': '2026-07-14T19:00:00Z',
  'TBD (Winner of 53452529)|TBD (Winner of 53452531)': '2026-07-15T19:00:00Z',
  'TBD (Loser of 53452533)|TBD (Loser of 53452535)': '2026-07-18T21:00:00Z',
  'TBD (Winner of 53452533)|TBD (Winner of 53452535)': '2026-07-19T19:00:00Z'
};

function pairKey(match) {
  return [match.home, match.away].filter(Boolean).sort().join('|');
}

function withCorrectKuwaitKickoff(match) {
  const kickoff = OFFICIAL_KICKOFFS_UTC[pairKey(match)];
  return kickoff ? { ...match, kickoff } : match;
}

function normalizeKickoffs(matches) {
  return (matches || []).map(withCorrectKuwaitKickoff);
}

module.exports = { normalizeKickoffs, withCorrectKuwaitKickoff };

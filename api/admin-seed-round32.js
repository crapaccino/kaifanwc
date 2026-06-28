const { client, json, requireAdmin } = require('./_supabase');

const ROUND = 'Round of 32';

const MATCHES = [
  { id: 3201, round: ROUND, group_name: 'R32', home: 'South Africa', away: 'Canada', kickoff: '2026-06-28T19:00:00.000Z' },
  { id: 3202, round: ROUND, group_name: 'R32', home: 'Brazil', away: 'Japan', kickoff: '2026-06-29T16:00:00.000Z' },
  { id: 3203, round: ROUND, group_name: 'R32', home: 'Germany', away: 'Paraguay', kickoff: '2026-06-29T19:00:00.000Z' },
  { id: 3204, round: ROUND, group_name: 'R32', home: 'Netherlands', away: 'Morocco', kickoff: '2026-06-30T16:00:00.000Z' },
  { id: 3205, round: ROUND, group_name: 'R32', home: 'France', away: 'Sweden', kickoff: '2026-06-30T19:00:00.000Z' },
  { id: 3206, round: ROUND, group_name: 'R32', home: 'Ivory Coast', away: 'Norway', kickoff: '2026-06-30T22:00:00.000Z' },
  { id: 3207, round: ROUND, group_name: 'R32', home: 'Mexico', away: 'Ecuador', kickoff: '2026-07-01T16:00:00.000Z' },
  { id: 3208, round: ROUND, group_name: 'R32', home: 'England', away: 'DR Congo', kickoff: '2026-07-01T17:00:00.000Z' },
  { id: 3209, round: ROUND, group_name: 'R32', home: 'Belgium', away: 'Senegal', kickoff: '2026-07-01T19:00:00.000Z' },
  { id: 3210, round: ROUND, group_name: 'R32', home: 'United States', away: 'Bosnia and Herzegovina', kickoff: '2026-07-02T16:00:00.000Z' },
  { id: 3211, round: ROUND, group_name: 'R32', home: 'Spain', away: 'Austria', kickoff: '2026-07-02T19:00:00.000Z' },
  { id: 3212, round: ROUND, group_name: 'R32', home: 'Portugal', away: 'Croatia', kickoff: '2026-07-03T13:00:00.000Z' },
  { id: 3213, round: ROUND, group_name: 'R32', home: 'Switzerland', away: 'Algeria', kickoff: '2026-07-03T16:00:00.000Z' },
  { id: 3214, round: ROUND, group_name: 'R32', home: 'Australia', away: 'Egypt', kickoff: '2026-07-03T19:00:00.000Z' },
  { id: 3215, round: ROUND, group_name: 'R32', home: 'Argentina', away: 'Cape Verde', kickoff: '2026-07-03T22:00:00.000Z' },
  { id: 3216, round: ROUND, group_name: 'R32', home: 'Colombia', away: 'Ghana', kickoff: '2026-07-04T01:30:00.000Z' }
];

async function findExisting(sb, match) {
  const { data, error } = await sb
    .from('matches')
    .select('id')
    .or(`id.eq.${match.id},and(round.eq.${match.round},home.eq.${match.home},away.eq.${match.away})`)
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    requireAdmin(req);
    const sb = client();
    const results = [];

    for (const match of MATCHES) {
      const existing = await findExisting(sb, match);
      const payload = {
        ...match,
        home_score: null,
        away_score: null,
        is_active: true
      };

      if (existing) {
        const { data, error } = await sb
          .from('matches')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        results.push({ action: 'updated', id: data.id, home: data.home, away: data.away, kickoff: data.kickoff });
      } else {
        const { data, error } = await sb
          .from('matches')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        results.push({ action: 'inserted', id: data.id, home: data.home, away: data.away, kickoff: data.kickoff });
      }
    }

    return json(res, 200, { ok: true, round: ROUND, count: results.length, results });
  } catch (e) {
    return json(res, 401, { error: e.message });
  }
};

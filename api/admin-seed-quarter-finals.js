const { client, json, requireAdmin } = require('./_supabase');

const ROUND = 'Quarter-finals';

const MATCHES = [
  { id: 4001, round: ROUND, group_name: 'QF', home: 'Morocco', away: 'France', kickoff: '2026-07-09T20:00:00.000Z' },
  { id: 4002, round: ROUND, group_name: 'QF', home: 'Spain', away: 'Belgium', kickoff: '2026-07-10T19:00:00.000Z' },
  { id: 4003, round: ROUND, group_name: 'QF', home: 'Norway', away: 'England', kickoff: '2026-07-11T21:00:00.000Z' },
  { id: 4004, round: ROUND, group_name: 'QF', home: 'Argentina', away: 'Switzerland', kickoff: '2026-07-12T01:00:00.000Z' }
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

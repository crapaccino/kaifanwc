const { client, json, requireAdmin } = require('./_supabase');
const { ROUND, semifinalFixtures } = require('./_semifinal-fixtures');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    requireAdmin(event);
    const sb = client();
    const fixtures = semifinalFixtures();
    const results = [];

    for (const fixture of fixtures) {
      const { data: existing, error: findError } = await sb
        .from('matches')
        .select('id')
        .eq('id', fixture.id)
        .maybeSingle();
      if (findError) throw findError;

      const payload = { ...fixture, home_score: null, away_score: null };
      if (existing) {
        const { error } = await sb.from('matches').update(payload).eq('id', fixture.id);
        if (error) throw error;
        results.push({ id: fixture.id, action: 'updated' });
      } else {
        const { error } = await sb.from('matches').insert(payload);
        if (error) throw error;
        results.push({ id: fixture.id, action: 'inserted' });
      }
    }

    return json(200, { ok: true, round: ROUND, count: results.length, fixtures, results });
  } catch (error) {
    return json(500, { error: error.message });
  }
};

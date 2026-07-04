const { client, json, requireAdmin } = require('./_supabase');
const { ROUND, round16Fixtures } = require('./_round16-fixtures');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    requireAdmin(event);
    const body = JSON.parse(event.body || '{}');
    const requestedWinner = String(body.last_winner || '').trim();
    if (requestedWinner && !['Colombia', 'Ghana'].includes(requestedWinner)) {
      return json(400, { error: 'The final opponent must be Colombia or Ghana.' });
    }

    const sb = client();
    const fixtures = round16Fixtures(requestedWinner);
    const results = [];

    for (const fixture of fixtures) {
      const { data: existing, error: findError } = await sb
        .from('matches')
        .select('id')
        .eq('id', fixture.id)
        .maybeSingle();
      if (findError) throw findError;

      if (existing) {
        const { error } = await sb.from('matches').update(fixture).eq('id', fixture.id);
        if (error) throw error;
        results.push({ id: fixture.id, action: 'updated' });
      } else {
        const { error } = await sb.from('matches').insert({ ...fixture, home_score: null, away_score: null });
        if (error) throw error;
        results.push({ id: fixture.id, action: 'inserted' });
      }
    }

    return json(200, { ok: true, round: ROUND, count: results.length, fixtures, results });
  } catch (error) {
    return json(500, { error: error.message });
  }
};

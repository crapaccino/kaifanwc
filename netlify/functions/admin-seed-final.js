const { client, json, requireAdmin } = require('./_supabase');
const { ROUND, finalFixture } = require('./_final-fixture');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  try {
    requireAdmin(event);
    const sb = client();
    const fixture = finalFixture();
    const payload = { ...fixture, home_score: null, away_score: null };
    const { data: existing, error: findError } = await sb
      .from('matches')
      .select('id')
      .eq('id', fixture.id)
      .maybeSingle();
    if (findError) throw findError;

    const query = existing
      ? sb.from('matches').update(payload).eq('id', fixture.id)
      : sb.from('matches').insert(payload);
    const { error } = await query;
    if (error) throw error;

    return json(200, {
      ok: true,
      round: ROUND,
      count: 1,
      fixture,
      action: existing ? 'updated' : 'inserted'
    });
  } catch (error) {
    return json(500, { error: error.message });
  }
};

const { client, json, requireAdmin } = require('./_supabase');

const KUWAIT_TZ = 'Asia/Kuwait';
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);
const UPDATE_STATUSES = new Set([...LIVE_STATUSES, ...FINISHED_STATUSES]);

const BEFORE_KICKOFF_MS = 20 * 60 * 1000;
const AFTER_KICKOFF_MS = 4 * 60 * 60 * 1000;

function normalizeTeam(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(united states|usa)\b/g, 'united states')
    .replace(/\b(korea republic)\b/g, 'south korea')
    .replace(/\b(cote d ivoire|côte d ivoire)\b/g, 'ivory coast')
    .replace(/\b(czech republic)\b/g, 'czechia')
    .trim();
}

function dateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KUWAIT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function isInActiveWindow(match, now = Date.now()) {
  const kickoff = new Date(match.kickoff).getTime();
  if (!Number.isFinite(kickoff)) return false;
  return now >= kickoff - BEFORE_KICKOFF_MS && now <= kickoff + AFTER_KICKOFF_MS;
}

function activeMatchesOnly(matches) {
  return (matches || []).filter(match => isInActiveWindow(match));
}

function daysForMatches(matches) {
  return [...new Set(matches.map(match => dateKey(new Date(match.kickoff))))].sort();
}

function authOk(event) {
  try {
    requireAdmin(event);
    return true;
  } catch (_) {
    const auth = event.headers.authorization || event.headers.Authorization || '';
    return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  }
}

async function fetchApiFixtures(date) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error('Missing FOOTBALL_API_KEY');

  const base = process.env.FOOTBALL_API_BASE || 'https://v3.football.api-sports.io';
  const url = `${base}/fixtures?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(KUWAIT_TZ)}`;
  const response = await fetch(url, {
    headers: { 'x-apisports-key': key }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Football API request failed');
  if (data.errors && Object.keys(data.errors).length) throw new Error(JSON.stringify(data.errors));
  return data.response || [];
}

function findFixture(match, fixtures) {
  const home = normalizeTeam(match.home);
  const away = normalizeTeam(match.away);
  const kickoff = new Date(match.kickoff).getTime();

  return fixtures.find(fixture => {
    const apiHome = normalizeTeam(fixture.teams && fixture.teams.home && fixture.teams.home.name);
    const apiAway = normalizeTeam(fixture.teams && fixture.teams.away && fixture.teams.away.name);
    const sameTeams = (apiHome === home && apiAway === away) || (apiHome === away && apiAway === home);
    if (!sameTeams) return false;

    const apiKickoff = fixture.fixture && fixture.fixture.date ? new Date(fixture.fixture.date).getTime() : null;
    if (!apiKickoff) return true;
    return Math.abs(apiKickoff - kickoff) <= 6 * 60 * 60 * 1000;
  });
}

function scoreForMatch(match, fixture) {
  const status = fixture.fixture && fixture.fixture.status ? fixture.fixture.status.short : '';
  const goals = fixture.goals || {};
  if (!UPDATE_STATUSES.has(status)) return null;
  if (goals.home === null || goals.away === null || goals.home === undefined || goals.away === undefined) return null;

  const apiHome = normalizeTeam(fixture.teams && fixture.teams.home && fixture.teams.home.name);
  const matchHome = normalizeTeam(match.home);
  const homeScore = Number(goals.home);
  const awayScore = Number(goals.away);

  return apiHome === matchHome
    ? { home_score: homeScore, away_score: awayScore, status }
    : { home_score: awayScore, away_score: homeScore, status };
}

exports.handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return json(405, { error: 'GET or POST only' });

  try {
    if (!authOk(event)) return json(401, { error: 'Admin password or cron secret is wrong' });

    const sb = client();
    const { data: matches, error } = await sb
      .from('matches')
      .select('*')
      .eq('is_active', true)
      .order('kickoff', { ascending: true });

    if (error) throw error;

    const matchesToCheck = activeMatchesOnly(matches || []);
    if (!matchesToCheck.length) {
      return json(200, { ok: true, checked_dates: [], updated: 0, updates: [], skipped: [], message: 'No matches are currently in the sync window, so no API requests were used.' });
    }

    const days = daysForMatches(matchesToCheck);
    const fixturesByDate = {};
    for (const day of days) fixturesByDate[day] = await fetchApiFixtures(day);

    const updates = [];
    const skipped = [];

    for (const match of matchesToCheck) {
      const day = dateKey(new Date(match.kickoff));
      const fixture = findFixture(match, fixturesByDate[day] || []);
      if (!fixture) {
        skipped.push({ id: match.id, match: `${match.home} vs ${match.away}`, reason: 'No matching API fixture' });
        continue;
      }

      const score = scoreForMatch(match, fixture);
      if (!score) {
        skipped.push({ id: match.id, match: `${match.home} vs ${match.away}`, reason: 'No live/final score yet' });
        continue;
      }

      if (Number(match.home_score) === score.home_score && Number(match.away_score) === score.away_score) continue;

      const { error: updateError } = await sb
        .from('matches')
        .update({ home_score: score.home_score, away_score: score.away_score })
        .eq('id', match.id);

      if (updateError) throw updateError;
      updates.push({ id: match.id, match: `${match.home} vs ${match.away}`, score: `${score.home_score}-${score.away_score}`, status: score.status });
    }

    return json(200, { ok: true, checked_dates: days, updated: updates.length, updates, skipped });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

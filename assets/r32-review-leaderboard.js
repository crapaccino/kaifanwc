(() => {
  const ROUND_RE = /round\s*of\s*32|round\s*32|r32/i;
  let stateCache = null;
  let playerCache = null;
  let busy = false;

  const $ = selector => document.querySelector(selector);
  const nickname = () => String(localStorage.getItem('kaifanwc_name') || '').trim().toLowerCase();
  const displayName = value => String(value || '').replace(/\b\w/g, c => c.toUpperCase());
  const fmtTime = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  const fmtDay = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value)).toUpperCase();

  async function fetchJson(path) {
    const response = await fetch('/.netlify/functions/' + path + (path.includes('?') ? '&' : '?') + 'ts=' + Date.now());
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function getState() {
    if (!stateCache) stateCache = await fetchJson('get-state');
    return stateCache;
  }

  async function getPlayer() {
    const name = nickname();
    if (!name) return { predictions: [] };
    if (!playerCache) playerCache = await fetchJson('get-player?nickname=' + encodeURIComponent(name)).catch(() => ({ predictions: [] }));
    return playerCache;
  }

  function r32Matches(state) {
    return (state.matches || [])
      .filter(match => ROUND_RE.test(String(match.round || '')))
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  }

  function labelForPrediction(prediction, match) {
    if (!prediction) return 'No pick';
    if (prediction.predicted_winner === 'home') return match.home;
    if (prediction.predicted_winner === 'away') return match.away;
    return 'Draw';
  }

  function predictionPoints(prediction, match) {
    if (!prediction || match.home_score == null || match.away_score == null) return null;
    const actual = match.home_score > match.away_score ? 'home' : (match.away_score > match.home_score ? 'away' : 'draw');
    if (Number(prediction.home_score) === Number(match.home_score) && Number(prediction.away_score) === Number(match.away_score)) return 5;
    if (prediction.predicted_winner === actual) return 2;
    return 0;
  }

  function hasR32Picks(player, matches) {
    const ids = new Set(matches.map(match => String(match.id)));
    return (player.predictions || []).some(prediction => ids.has(String(prediction.match_id)));
  }

  async function renderR32Review() {
    const matchesEl = $('#matches');
    const submit = $('#submitBtn');
    if (!matchesEl) return;

    document.querySelectorAll('#roundTabs button').forEach(button => button.classList.remove('active'));
    $('#r32ReviewBtn')?.classList.add('active');
    if (submit) submit.style.display = 'none';
    matchesEl.innerHTML = '<div class="notice">Loading Round of 32 picks...</div>';

    try {
      stateCache = null;
      playerCache = null;
      const [state, player] = await Promise.all([getState(), getPlayer()]);
      const matches = r32Matches(state);
      const picks = {};
      (player.predictions || []).forEach(prediction => { picks[String(prediction.match_id)] = prediction; });
      const finished = matches.filter(match => match.home_score != null && match.away_score != null);
      const earned = finished.reduce((sum, match) => sum + (predictionPoints(picks[String(match.id)], match) || 0), 0);

      const grouped = {};
      matches.forEach(match => {
        const day = fmtDay(match.kickoff);
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(match);
      });

      const body = Object.entries(grouped).map(([day, games]) => '<div class="day-header">' + day + '</div>' + games.map(match => {
        const pick = picks[String(match.id)];
        const predictedScore = pick ? (pick.home_score + ' - ' + pick.away_score) : 'No pick';
        const actual = match.home_score == null || match.away_score == null ? 'Not played yet' : ('Actual: ' + match.home_score + ' - ' + match.away_score);
        const points = predictionPoints(pick, match);
        const pointsText = points == null ? '' : '<br><span class="small">Points: <b>' + points + '</b></span>';
        return '<div class="match">'
          + '<div class="match-top"><div class="team home"><span class="team-name">' + match.home + '</span></div><div class="result-score muted-score">' + fmtTime(match.kickoff) + '</div><div class="team away"><span class="team-name">' + match.away + '</span></div></div>'
          + '<div class="match-info"><div class="meta-row"><span>Round of 32 locked picks</span><span>' + fmtTime(match.kickoff) + ' Kuwait</span></div></div>'
          + '<div class="notice"><b>' + displayName(nickname() || 'You') + ' picked: ' + labelForPrediction(pick, match) + '</b><br><span class="small">Predicted score: ' + predictedScore + ' • ' + actual + '</span>' + pointsText + '</div>'
          + '</div>';
      }).join('')).join('');

      matchesEl.innerHTML = '<div class="round-lock locked-notice"><b>Round of 32 picks locked 🔒</b><br><span class="small">You can review your Round of 32 predictions here. Current R32 points from finished matches: ' + earned + '.</span></div>' + (body || '<div class="notice">No Round of 32 matches found.</div>');
    } catch (error) {
      matchesEl.innerHTML = '<div class="notice"><span class="bad">' + error.message + '</span></div>';
    }
  }

  async function ensureR32ReviewTab() {
    if (busy) return;
    const tabs = $('#roundTabs');
    if (!tabs || $('#r32ReviewBtn')) return;
    busy = true;
    try {
      const [state, player] = await Promise.all([getState(), getPlayer()]);
      const matches = r32Matches(state);
      if (!matches.length || !hasR32Picks(player, matches)) return;
      const openR32Tab = [...tabs.querySelectorAll('button[data-tab]')].find(button => ROUND_RE.test(button.dataset.tab || button.textContent || ''));
      if (openR32Tab) return;

      const button = document.createElement('button');
      button.id = 'r32ReviewBtn';
      button.type = 'button';
      button.textContent = 'Round of 32 🔒';
      button.onclick = renderR32Review;
      const leaderboard = tabs.querySelector('[data-tab="leaderboard"]');
      tabs.insertBefore(button, leaderboard || tabs.firstChild);
    } catch (_) {
    } finally {
      busy = false;
    }
  }

  async function addLeaderboardR32Column() {
    const table = document.querySelector('.leaderboard-tab table');
    if (!table || table.dataset.r32Column === '1') return;
    const state = await getState();
    const byName = {};
    (state.leaderboard || []).forEach(row => { byName[String(row.nickname || '').trim().toLowerCase()] = row; });

    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;
    const th = document.createElement('th');
    th.textContent = 'R32';
    th.title = 'Round of 32 locked picks';
    headerRow.appendChild(th);

    table.querySelectorAll('tbody tr').forEach(row => {
      const name = String(row.children[1]?.textContent || '').trim().toLowerCase();
      const player = byName[name];
      const td = document.createElement('td');
      td.textContent = player?.r32_locked ? '✅' : '—';
      td.title = player?.r32_locked ? 'Round of 32 locked' : 'No Round of 32 picks locked yet';
      row.appendChild(td);
    });
    table.dataset.r32Column = '1';
  }

  function tick() {
    ensureR32ReviewTab();
    addLeaderboardR32Column().catch(() => {});
  }

  const observer = new MutationObserver(tick);
  window.addEventListener('load', () => {
    observer.observe(document.body, { childList: true, subtree: true });
    tick();
    setInterval(tick, 1500);
  });
})();

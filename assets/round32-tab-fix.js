(() => {
  const ROUND = 'Round of 32';
  const $ = s => document.querySelector(s);
  const nickname = () => String(localStorage.getItem('kaifanwc_name') || '').trim().toLowerCase();
  const displayRoundName = r => String(r || '').replace('Group Stage - ', '').replace('Group Stage ', '');
  const fmtTime = d => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));
  const fmtDay = d => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d)).toUpperCase();
  const fmtFull = d => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));

  let state = null;
  let player = null;
  let picks = {};

  async function getJson(url, opts) {
    const r = await fetch(url, opts);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  }

  async function api(path, opts) {
    try {
      return await getJson('/api/' + path, opts);
    } catch (e) {
      return await getJson('/.netlify/functions/' + path, opts);
    }
  }

  function roundMatches() {
    return ((state && state.matches) || [])
      .filter(m => m.round === ROUND)
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  }

  function openMatches() {
    const now = Date.now();
    const saved = new Set(((player && player.predictions) || []).map(p => String(p.match_id)));
    return roundMatches().filter(m => new Date(m.kickoff).getTime() > now && !saved.has(String(m.id)));
  }

  function renderMatch(m) {
    const p = picks[m.id] || {};
    const pickBtn = (key, label) => '<button class="' + (p.predicted_winner === key ? 'active' : '') + '" data-r32-pick="' + m.id + ':' + key + '">' + label + '</button>';
    return '<div class="match">'
      + '<div class="match-top"><div class="team home"><span class="team-name">' + m.home + '</span></div><div class="result-score muted-score">' + fmtTime(m.kickoff) + '</div><div class="team away"><span class="team-name">' + m.away + '</span></div></div>'
      + '<div class="match-info"><div class="meta-row"><span>Round of 32</span><span>' + fmtTime(m.kickoff) + ' Kuwait</span></div></div>'
      + '<div class="pick">' + pickBtn('home', m.home) + pickBtn('draw', 'Draw') + pickBtn('away', m.away) + '</div>'
      + '<div class="score"><input type="number" min="0" max="20" placeholder="' + m.home + '" value="' + (p.home_score ?? '') + '" data-r32-score="' + m.id + ':home"><span class="score-dash">-</span><input type="number" min="0" max="20" placeholder="' + m.away + '" value="' + (p.away_score ?? '') + '" data-r32-score="' + m.id + ':away"></div>'
      + '</div>';
  }

  async function loadData() {
    state = await api('get-state');
    const name = nickname();
    if (name) {
      try {
        player = await api('get-player?nickname=' + encodeURIComponent(name));
      } catch (_) {
        player = { predictions: [] };
      }
    } else {
      player = { predictions: [] };
    }
  }

  async function renderRound32() {
    const matchesEl = $('#matches');
    const submitBtn = $('#submitBtn');
    if (!matchesEl) return;
    document.querySelectorAll('#roundTabs button').forEach(b => b.classList.remove('active'));
    const tab = document.querySelector('[data-r32-tab="1"]');
    if (tab) tab.classList.add('active');
    if (submitBtn) {
      submitBtn.style.display = 'block';
      submitBtn.textContent = 'Lock in picks';
      submitBtn.disabled = false;
    }

    await loadData();
    const matches = openMatches();
    if (!matches.length) {
      matchesEl.innerHTML = '<div class="notice"><b>Round of 32 is locked.</b><br><span class="small">No remaining Round of 32 games are open for predictions.</span></div>';
      if (submitBtn) submitBtn.style.display = 'none';
      return;
    }

    const grouped = {};
    matches.forEach(m => { const day = fmtDay(m.kickoff); if (!grouped[day]) grouped[day] = []; grouped[day].push(m); });
    const first = matches[0];
    matchesEl.innerHTML = '<div class="round-lock open-notice">⏳ Round of 32 is open. Next deadline: ' + fmtFull(first.kickoff) + ' Kuwait time.</div>'
      + Object.entries(grouped).map(([day, games]) => '<div class="day-header">' + day + '</div>' + games.map(renderMatch).join('')).join('');

    document.querySelectorAll('[data-r32-pick]').forEach(btn => btn.onclick = () => {
      const [id, winner] = btn.dataset.r32Pick.split(':');
      picks[id] = { ...(picks[id] || {}), predicted_winner: winner };
      renderRound32();
    });
    document.querySelectorAll('[data-r32-score]').forEach(inp => inp.oninput = () => {
      const [id, side] = inp.dataset.r32Score.split(':');
      picks[id] = { ...(picks[id] || {}) };
      picks[id][side === 'home' ? 'home_score' : 'away_score'] = inp.value === '' ? null : Number(inp.value);
    });

    if (submitBtn) submitBtn.onclick = submitRound32;
  }

  async function submitRound32() {
    try {
      const name = nickname();
      if (!name) throw new Error('Enter your name first.');
      await loadData();
      const matches = openMatches();
      const missing = matches.find(m => {
        const p = picks[m.id] || {};
        return !p.predicted_winner || !Number.isInteger(p.home_score) || !Number.isInteger(p.away_score);
      });
      if (missing) throw new Error('Please predict every remaining Round of 32 match before locking in.');
      const predictions = matches.map(m => ({
        match_id: m.id,
        predicted_winner: picks[m.id].predicted_winner,
        home_score: picks[m.id].home_score,
        away_score: picks[m.id].away_score
      }));
      const result = await api('submit-predictions', { method: 'POST', body: JSON.stringify({ nickname: name, predictions }) });
      $('#status').innerHTML = '<span class="ok">Locked in ' + result.saved + ' Round of 32 picks.</span>';
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      $('#status').innerHTML = '<span class="bad">' + e.message + '</span>';
    }
  }

  async function injectTab() {
    const tabs = $('#roundTabs');
    if (!tabs || tabs.querySelector('[data-r32-tab="1"]')) return;
    try {
      await loadData();
      if (!roundMatches().length || !openMatches().length) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.r32Tab = '1';
      btn.textContent = displayRoundName(ROUND);
      btn.onclick = renderRound32;
      const leaderboard = tabs.querySelector('[data-tab="leaderboard"]');
      tabs.insertBefore(btn, leaderboard || tabs.firstChild);
    } catch (_) {}
  }

  window.addEventListener('load', () => {
    setInterval(injectTab, 1000);
    injectTab();
  });
})();

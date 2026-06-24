(() => {
  const LATE_ROUND_RE = /round\s*3/i;
  const ROUND_LABEL = 'Round 3';
  const picks = {};
  let statePromise = null;
  let playerPromise = null;
  let openMatches = [];
  let savedMatchIds = new Set();

  const $ = selector => document.querySelector(selector);
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const displayName = value => String(value || '').replace(/\b\w/g, c => c.toUpperCase());
  const fmtTime = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  const fmtDay = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value)).toUpperCase();
  const fmtFull = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  async function api(path, opts = {}) {
    const response = await fetch('/.netlify/functions/' + path, opts);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function nickname() { return normalize(localStorage.getItem('kaifanwc_name')); }
  function getState() { if (!statePromise) statePromise = api('get-state'); return statePromise; }
  function getPlayer() {
    const name = nickname();
    if (!name) return Promise.resolve({ predictions: [] });
    if (!playerPromise) playerPromise = api('get-player?nickname=' + encodeURIComponent(name)).catch(() => ({ predictions: [] }));
    return playerPromise;
  }

  function isLateRound(match) { return LATE_ROUND_RE.test(String(match.round || '')); }
  function matchOpen(match) { return new Date(match.kickoff).getTime() > Date.now(); }
  function isLateEligible(match) { return isLateRound(match) && matchOpen(match); }

  function teamBlock(team, side) { return `<div class="team ${side}"><span class="team-name">${team}</span></div>`; }
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randomScoreForWinner(winner) {
    if (winner === 'draw') { const score = randomInt(0, 3); return [score, score]; }
    const loserScore = randomInt(0, 2);
    const winnerScore = randomInt(loserScore + 1, Math.min(loserScore + 4, 6));
    return winner === 'home' ? [winnerScore, loserScore] : [loserScore, winnerScore];
  }
  function randomizeRemaining(remaining) {
    remaining.forEach(match => {
      const winner = ['home', 'draw', 'away'][randomInt(0, 2)];
      const [home_score, away_score] = randomScoreForWinner(winner);
      picks[match.id] = { predicted_winner: winner, home_score, away_score };
    });
  }

  function renderMatch(match) {
    const pick = picks[match.id] || {};
    const option = (key, label) => `<button class="${pick.predicted_winner === key ? 'active' : ''}" data-late-pick="${match.id}:${key}">${label}</button>`;
    return `<div class="match late-round-match">
      <div class="match-top">${teamBlock(match.home, 'home')}<div class="result-score muted-score">${fmtTime(match.kickoff)}</div>${teamBlock(match.away, 'away')}</div>
      <div class="match-info"><div class="meta-row"><span>Group ${match.group_name || ''}</span><span>${fmtFull(match.kickoff)} Kuwait</span></div></div>
      <div class="pick">${option('home', match.home)}${option('draw', 'Draw')}${option('away', match.away)}</div>
      <div class="score"><input type="number" min="0" max="20" placeholder="${match.home}" value="${pick.home_score ?? ''}" data-late-score="${match.id}:home"><span class="score-dash">-</span><input type="number" min="0" max="20" placeholder="${match.away}" value="${pick.away_score ?? ''}" data-late-score="${match.id}:away"></div>
    </div>`;
  }

  async function prepare() {
    const [main, player] = await Promise.all([getState(), getPlayer()]);
    savedMatchIds = new Set((player.predictions || []).map(prediction => String(prediction.match_id)));
    openMatches = (main.matches || []).filter(isLateEligible).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    return { main, player };
  }

  async function shouldShowLateButton() {
    await prepare();
    const remaining = openMatches.filter(match => !savedMatchIds.has(String(match.id)));
    return remaining.length > 0;
  }

  async function addButton() {
    const tabs = $('#roundTabs');
    if (!tabs || $('#lateRound3Btn')) return;
    if (!(await shouldShowLateButton())) return;
    const button = document.createElement('button');
    button.id = 'lateRound3Btn';
    button.type = 'button';
    button.textContent = 'Round 3 Late 🔓';
    button.onclick = renderLateRound;
    tabs.appendChild(button);
  }

  function bindLateInputs() {
    document.querySelectorAll('[data-late-pick]').forEach(button => { button.onclick = () => { const [id, value] = button.dataset.latePick.split(':'); picks[id] = { ...(picks[id] || {}), predicted_winner: value }; renderLateRound(); }; });
    document.querySelectorAll('[data-late-score]').forEach(input => { input.oninput = () => { const [id, side] = input.dataset.lateScore.split(':'); picks[id] = { ...(picks[id] || {}) }; picks[id][side === 'home' ? 'home_score' : 'away_score'] = input.value === '' ? null : Number(input.value); }; });
    document.querySelectorAll('[data-late-random]').forEach(button => { button.onclick = async () => { await prepare(); const remaining = openMatches.filter(match => !savedMatchIds.has(String(match.id))); randomizeRemaining(remaining); await renderLateRound(); }; });
    document.querySelectorAll('[data-late-submit]').forEach(button => { button.onclick = submitLateRound; });
  }

  async function renderLateRound() {
    try {
      statePromise = null;
      playerPromise = null;
      await prepare();
      document.querySelectorAll('#roundTabs button').forEach(button => button.classList.remove('active'));
      $('#lateRound3Btn')?.classList.add('active');
      const remaining = openMatches.filter(match => !savedMatchIds.has(String(match.id)));
      $('#submitBtn').style.display = 'block';
      $('#submitBtn').disabled = false;
      $('#submitBtn').textContent = 'Lock in remaining Round 3 picks';
      $('#submitBtn').onclick = submitLateRound;
      if (!remaining.length) { $('#matches').innerHTML = '<div class="notice"><b>Round 3 is already locked for you.</b><br><span class="small">You have already submitted the remaining open Round 3 matches.</span></div>'; return; }
      const grouped = {};
      remaining.forEach(match => { const day = fmtDay(match.kickoff); if (!grouped[day]) grouped[day] = []; grouped[day].push(match); });
      const first = remaining[0];
      const notice = `<div class="round-lock open-notice">🔓 Late Round 3 is open only for matches that have not kicked off yet. Each game locks at its own kickoff. Next deadline: ${fmtFull(first.kickoff)} Kuwait time.</div>`;
      const topControls = `<div class="action-bar late-top-actions"><button type="button" class="secondary" data-late-random>Random Pick All</button><button type="button" data-late-submit>Lock in remaining Round 3 picks</button></div>`;
      $('#matches').innerHTML = notice + topControls + Object.entries(grouped).map(([day, games]) => `<div class="day-header">${day}</div>${games.map(renderMatch).join('')}`).join('');
      bindLateInputs();
    } catch (error) { $('#status').innerHTML = `<span class="bad">${error.message}</span>`; }
  }

  async function submitLateRound() {
    try {
      const name = nickname();
      if (!name) throw new Error('Enter your name first.');
      await prepare();
      const remaining = openMatches.filter(match => !savedMatchIds.has(String(match.id)));
      const missing = remaining.find(match => { const pick = picks[match.id] || {}; return !pick.predicted_winner || !Number.isInteger(pick.home_score) || !Number.isInteger(pick.away_score); });
      if (missing) throw new Error('Please predict the winner/draw and both scores for every remaining Round 3 match.');
      const predictions = remaining.map(match => { const pick = picks[match.id]; return { match_id: match.id, predicted_winner: pick.predicted_winner, home_score: pick.home_score, away_score: pick.away_score }; });
      const result = await api('submit-predictions', { method: 'POST', body: JSON.stringify({ nickname: name, predictions }) });
      $('#status').innerHTML = `<span class="ok">Locked in ${result.saved} remaining Round 3 picks for ${displayName(name)}.</span>`;
      statePromise = null; playerPromise = null; await renderLateRound();
    } catch (error) { $('#status').innerHTML = `<span class="bad">${error.message}</span>`; }
  }

  let queued = false;
  function queueButtonCheck() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; addButton(); }); }
  const observer = new MutationObserver(queueButtonCheck);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', queueButtonCheck);
  setInterval(queueButtonCheck, 1000);
})();
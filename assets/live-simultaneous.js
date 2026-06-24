(() => {
  let rendering = false;
  let lastKey = '';

  const $ = selector => document.querySelector(selector);
  const displayName = value => String(value || '').replace(/\b\w/g, c => c.toUpperCase());
  const fmtTime = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  const fmtFull = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  function isLiveTabActive() {
    return !!document.querySelector('#roundTabs button.active[data-tab="live"]');
  }

  function actualWinnerKey(match) {
    if (match.home_score == null || match.away_score == null) return null;
    if (Number(match.home_score) > Number(match.away_score)) return 'home';
    if (Number(match.away_score) > Number(match.home_score)) return 'away';
    return 'draw';
  }

  function statusForPrediction(prediction, match) {
    const winner = actualWinnerKey(match);
    if (!winner) return { label: 'Waiting score', cls: 'neutral', icon: '⏳' };
    const dist = Math.abs(Number(prediction.home_score) - Number(match.home_score)) + Math.abs(Number(prediction.away_score) - Number(match.away_score));
    if (dist === 0) return { label: 'Perfect', cls: 'perfect', icon: '🥇' };
    if (prediction.predicted_winner === winner) return { label: dist <= 2 ? `${dist} goal${dist === 1 ? '' : 's'} away` : 'Winner correct', cls: 'close', icon: dist <= 2 ? '🎯' : '🟡' };
    return { label: 'Wrong', cls: 'wrong', icon: '🔴' };
  }

  function crowdPick(summary) {
    if (!summary || !summary.total) return null;
    return [summary.home, summary.draw, summary.away].sort((a, b) => b.percent - a.percent)[0];
  }

  function teamBlock(team, side) {
    return `<div class="team ${side}"><span class="team-name">${team}</span></div>`;
  }

  function bar(item, cls) {
    return `<div class="percent-row"><div class="percent-label"><span>${item.label}</span><b>${item.percent}%</b></div><div class="percent-track"><div class="percent-fill ${cls}" style="width:${item.percent}%"></div></div><small>${item.count} pick${item.count === 1 ? '' : 's'}</small></div>`;
  }

  function renderGame(game, index, totalGames) {
    const match = game.match;
    const summary = game.summary || { total: 0, home: { label: match.home, count: 0, percent: 0 }, draw: { label: 'Draw', count: 0, percent: 0 }, away: { label: match.away, count: 0, percent: 0 } };
    const actual = match.home_score != null && match.away_score != null ? `${match.home_score} – ${match.away_score}` : fmtTime(match.kickoff);
    const crowd = crowdPick(summary);
    const rows = (game.predictions || []).map(prediction => {
      const status = statusForPrediction(prediction, match);
      return `<div class="live-pick-row ${status.cls}">
        <div><b>${displayName(prediction.nickname)}</b><span>${prediction.predicted_winner_label}</span><em class="status-chip ${status.cls}">${status.icon} ${status.label}</em></div>
        <strong>${prediction.home_score} - ${prediction.away_score}</strong>
      </div>`;
    }).join('');

    return `
      <div class="live-card" data-simultaneous-game="${match.id}">
        <div class="live-badge">${totalGames > 1 ? `SIMULTANEOUS ${index + 1}/${totalGames}` : 'LIVE / LATEST 🔴'}</div>
        <div class="match-top live-match-top">${teamBlock(match.home, 'home')}<div class="result-score">${actual}</div>${teamBlock(match.away, 'away')}</div>
        <div class="match-info"><div class="meta-row"><span>Group ${match.group_name || ''}</span><span>${fmtFull(match.kickoff)} Kuwait</span></div></div>
      </div>
      ${crowd ? `<div class="live-card crowd-card"><div class="crowd-label">👥 Crowd pick</div><h2>${crowd.label}</h2><p>${crowd.percent}% of players picked this outcome.</p></div>` : ''}
      <div class="live-card">
        <h2>Prediction split</h2>
        <p class="small">Based on ${summary.total} locked prediction${summary.total === 1 ? '' : 's'} for this match.</p>
        ${bar(summary.home, 'home-fill')}
        ${bar(summary.draw, 'draw-fill')}
        ${bar(summary.away, 'away-fill')}
      </div>
      <div class="live-card">
        <h2>Everyone’s predictions</h2>
        ${rows || '<div class="notice">No predictions submitted for this match yet.</div>'}
      </div>`;
  }

  async function renderSimultaneousLive() {
    if (rendering || !isLiveTabActive()) return;
    rendering = true;
    try {
      const response = await fetch('/.netlify/functions/get-live?ts=' + Date.now());
      const data = await response.json();
      const games = Array.isArray(data.games) ? data.games : [];
      if (games.length <= 1) return;

      const key = games.map(game => `${game.match.id}:${game.match.home_score ?? ''}-${game.match.away_score ?? ''}:${game.predictions?.length || 0}`).join('|');
      if (key === lastKey && document.querySelector('[data-simultaneous-game]')) return;
      lastKey = key;

      $('#submitBtn').style.display = 'none';
      $('#matches').innerHTML = `<div class="round-lock open-notice">🔴 Showing all ${games.length} matches from the latest kickoff window.</div>` + games.map((game, index) => renderGame(game, index, games.length)).join('');
    } catch (error) {
      const status = $('#status');
      if (status) status.innerHTML = `<span class="bad">${error.message}</span>`;
    } finally {
      rendering = false;
    }
  }

  let queued = false;
  function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      renderSimultaneousLive();
    });
  }

  const observer = new MutationObserver(queueRender);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', queueRender);
  setInterval(renderSimultaneousLive, 30000);
})();
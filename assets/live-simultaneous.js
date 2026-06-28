(() => {
  const STATUS_ORDER = { exact: 0, winnerAlive: 1, winnerDead: 2, alive: 3, wrong: 4, neutral: 5 };
  let rendering = false;
  let lastKey = '';

  const $ = selector => document.querySelector(selector);
  const displayName = value => String(value || '').replace(/\b\w/g, c => c.toUpperCase());
  const fmtTime = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  const fmtFull = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  function isLiveTabActive() {
    return !!document.querySelector('#roundTabs button.active[data-tab="live"]');
  }

  function winnerLabel(home, away, homeScore, awayScore) {
    if (homeScore > awayScore) return home;
    if (awayScore > homeScore) return away;
    return 'Draw';
  }

  function predictedWinnerText(prediction, match) {
    if (prediction.predicted_winner === 'home') return match.home;
    if (prediction.predicted_winner === 'away') return match.away;
    return 'Draw';
  }

  function isFullTime(match) {
    return Date.now() >= new Date(match.kickoff).getTime() + (2 * 60 * 60 * 1000);
  }

  function statusForPrediction(prediction, match) {
    if (match.home_score == null || match.away_score == null) {
      return { kind: 'neutral', label: 'Waiting score', cls: 'neutral', icon: '⏳', goalsAway: 999 };
    }

    const currentHome = Number(match.home_score);
    const currentAway = Number(match.away_score);
    const predictedHome = Number(prediction.home_score);
    const predictedAway = Number(prediction.away_score);
    const fullTime = isFullTime(match);
    const currentWinner = winnerLabel(match.home, match.away, currentHome, currentAway);
    const predictedWinner = predictedWinnerText(prediction, match);
    const away = Math.abs(predictedHome - currentHome) + Math.abs(predictedAway - currentAway);
    const exactScore = away === 0;
    const rightWinner = predictedWinner === currentWinner;
    const scoreStillAlive = currentHome <= predictedHome && currentAway <= predictedAway;
    const awayLabel = `${away} goal${away === 1 ? '' : 's'} away`;

    if (exactScore) {
      return { kind: 'exact', cls: 'perfect', icon: '🥇', label: fullTime ? 'Perfect final score' : 'Perfect score', goalsAway: 0 };
    }
    if (rightWinner && fullTime) {
      return { kind: 'winnerDead', cls: 'perfect', icon: '✅', label: `Correct winner - ${awayLabel}`, goalsAway: away };
    }
    if (fullTime) {
      return { kind: 'wrong', cls: 'wrong', icon: '🔴', label: 'Wrong final result', goalsAway: away };
    }
    if (rightWinner && scoreStillAlive) {
      return { kind: 'winnerAlive', cls: 'perfect', icon: '✅', label: awayLabel, goalsAway: away };
    }
    if (rightWinner) {
      return { kind: 'winnerDead', cls: 'perfect', icon: '✅', label: `${awayLabel} - exact score impossible`, goalsAway: away };
    }
    if (scoreStillAlive) {
      return { kind: 'alive', cls: 'close', icon: '🟡', label: 'Still alive', goalsAway: away };
    }
    return { kind: 'alive', cls: 'close', icon: '🟡', label: 'Winner still possible - exact score impossible', goalsAway: away };
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

  function predictionRows(game) {
    const match = game.match;
    return (game.predictions || [])
      .map((prediction, originalIndex) => ({ prediction, status: statusForPrediction(prediction, match), originalIndex }))
      .sort((a, b) => {
        const rankA = STATUS_ORDER[a.status.kind] ?? 99;
        const rankB = STATUS_ORDER[b.status.kind] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        if (a.status.goalsAway !== b.status.goalsAway) return a.status.goalsAway - b.status.goalsAway;
        return a.originalIndex - b.originalIndex;
      })
      .map(({ prediction, status }) => `<div class="live-pick-row ${status.cls}${status.kind === 'exact' ? ' exact-score' : ''}">
        <div><b>${displayName(prediction.nickname)}</b><span>${prediction.predicted_winner_label}</span><em class="status-chip ${status.cls}${status.kind === 'exact' ? ' exact-score' : ''}">${status.icon} ${status.label}</em></div>
        <strong>${prediction.home_score} - ${prediction.away_score}</strong>
      </div>`)
      .join('');
  }

  function renderGame(game, index, totalGames) {
    const match = game.match;
    const summary = game.summary || { total: 0, home: { label: match.home, count: 0, percent: 0 }, draw: { label: 'Draw', count: 0, percent: 0 }, away: { label: match.away, count: 0, percent: 0 } };
    const actual = match.home_score != null && match.away_score != null ? `${match.home_score} – ${match.away_score}` : fmtTime(match.kickoff);
    const crowd = crowdPick(summary);
    const rows = predictionRows(game);
    const fullTime = isFullTime(match);

    return `
      <div class="live-card" data-simultaneous-game="${match.id}">
        <div class="live-badge ${fullTime ? 'full-time-badge' : ''}">${fullTime ? 'FULL TIME ✅' : (totalGames > 1 ? `SIMULTANEOUS ${index + 1}/${totalGames}` : 'LIVE / LATEST 🔴')}</div>
        <div class="match-top live-match-top">${teamBlock(match.home, 'home')}<div class="result-score">${actual}</div>${teamBlock(match.away, 'away')}</div>
        <div class="match-info"><div class="meta-row"><span>Group ${match.group_name || ''}</span><span>${fmtFull(match.kickoff)} Kuwait</span>${fullTime ? '<span class="full-time-note">Full time</span>' : ''}</div></div>
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

      if (!isLiveTabActive()) return;

      const games = Array.isArray(data.games) ? data.games : [];
      if (games.length <= 1) return;

      const key = games.map(game => `${game.match.id}:${game.match.home_score ?? ''}-${game.match.away_score ?? ''}:${game.predictions?.length || 0}:${isFullTime(game.match) ? 'ft' : 'live'}`).join('|');
      if (key === lastKey && document.querySelector('[data-simultaneous-game]')) return;
      lastKey = key;

      if (!isLiveTabActive()) return;
      $('#submitBtn').style.display = 'none';
      $('#matches').innerHTML = `<div class="round-lock open-notice">🔴 Showing all ${games.length} matches from the latest kickoff window.</div>` + games.map((game, index) => renderGame(game, index, games.length)).join('');
    } catch (error) {
      const status = $('#status');
      if (status && isLiveTabActive()) status.innerHTML = `<span class="bad">${error.message}</span>`;
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

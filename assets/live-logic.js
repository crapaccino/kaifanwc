(() => {
  const STATUS_ORDER = { exact: 0, winnerAlive: 1, winnerDead: 2, alive: 3, wrong: 4, neutral: 5 };
  let refreshQueued = false;
  let isRefreshing = false;

  function scoreNumbers(text) {
    const match = String(text || '').match(/(\d+)\s*[-–]\s*(\d+)/);
    return match ? [Number(match[1]), Number(match[2])] : null;
  }

  function cleanText(el) {
    return String(el?.textContent || '').trim().replace(/\s+/g, ' ');
  }

  function winnerLabel(home, away, homeScore, awayScore) {
    if (homeScore > awayScore) return home;
    if (awayScore > homeScore) return away;
    return 'Draw';
  }

  function goalsAway(currentHome, currentAway, predictedHome, predictedAway) {
    return Math.abs(predictedHome - currentHome) + Math.abs(predictedAway - currentAway);
  }

  function setStatus(row, status) {
    row.classList.remove('perfect', 'close', 'wrong', 'neutral', 'exact-score');
    row.classList.add(status.cls);
    if (status.kind === 'exact') row.classList.add('exact-score');
    row.dataset.liveStatusRank = String(STATUS_ORDER[status.kind] ?? 99);
    row.dataset.liveGoalsAway = String(status.goalsAway ?? 999);

    const chip = row.querySelector('.status-chip:not(.bold)');
    if (chip) {
      chip.classList.remove('perfect', 'close', 'wrong', 'neutral', 'exact-score');
      chip.classList.add(status.cls);
      if (status.kind === 'exact') chip.classList.add('exact-score');
      chip.textContent = `${status.icon} ${status.label}`;
    }
  }

  function refreshLiveStatuses() {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
      const liveCard = document.querySelector('.live-card .live-match-top');
      const predictionsCard = [...document.querySelectorAll('.live-card')].find(card => card.querySelector('.live-pick-row'));
      if (!liveCard || !predictionsCard) return;

      const score = scoreNumbers(cleanText(liveCard.querySelector('.result-score')));
      if (!score) return;

      const [currentHome, currentAway] = score;
      const teams = liveCard.querySelectorAll('.team-name');
      const homeTeam = cleanText(teams[0]);
      const awayTeam = cleanText(teams[1]);
      const currentWinner = winnerLabel(homeTeam, awayTeam, currentHome, currentAway);

      const rows = [...predictionsCard.querySelectorAll('.live-pick-row')];
      rows.forEach((row, originalIndex) => {
        row.dataset.originalLiveOrder = row.dataset.originalLiveOrder || String(originalIndex);
        const predictedWinner = cleanText(row.querySelector('span'));
        const pickScore = scoreNumbers(cleanText(row.querySelector('strong')));
        if (!pickScore) {
          setStatus(row, { kind: 'neutral', cls: 'neutral', icon: '⏳', label: 'Waiting score' });
          return;
        }

        const [predictedHome, predictedAway] = pickScore;
        const away = goalsAway(currentHome, currentAway, predictedHome, predictedAway);
        const exactScore = away === 0;
        const rightWinner = predictedWinner === currentWinner;
        const scoreStillAlive = currentHome <= predictedHome && currentAway <= predictedAway;
        const awayLabel = `${away} goal${away === 1 ? '' : 's'} away`;

        if (exactScore) {
          setStatus(row, { kind: 'exact', cls: 'perfect', icon: '🥇', label: 'Perfect score', goalsAway: 0 });
        } else if (rightWinner && scoreStillAlive) {
          setStatus(row, { kind: 'winnerAlive', cls: 'perfect', icon: '✅', label: awayLabel, goalsAway: away });
        } else if (rightWinner) {
          setStatus(row, { kind: 'winnerDead', cls: 'perfect', icon: '✅', label: `${awayLabel} - score impossible`, goalsAway: away });
        } else if (scoreStillAlive) {
          setStatus(row, { kind: 'alive', cls: 'close', icon: '🟡', label: 'Still alive' });
        } else {
          setStatus(row, { kind: 'wrong', cls: 'wrong', icon: '🔴', label: 'Dead pick' });
        }
      });

      const sortedRows = [...rows].sort((a, b) => {
        const rankA = Number(a.dataset.liveStatusRank || 99);
        const rankB = Number(b.dataset.liveStatusRank || 99);
        if (rankA !== rankB) return rankA - rankB;
        const goalsA = Number(a.dataset.liveGoalsAway || 999);
        const goalsB = Number(b.dataset.liveGoalsAway || 999);
        if (goalsA !== goalsB) return goalsA - goalsB;
        return Number(a.dataset.originalLiveOrder || 0) - Number(b.dataset.originalLiveOrder || 0);
      });

      const alreadySorted = sortedRows.every((row, index) => row === rows[index]);
      if (!alreadySorted) {
        const fragment = document.createDocumentFragment();
        sortedRows.forEach(row => fragment.appendChild(row));
        predictionsCard.appendChild(fragment);
      }
    } finally {
      isRefreshing = false;
    }
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      refreshLiveStatuses();
    });
  }

  const observer = new MutationObserver(queueRefresh);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', queueRefresh);
})();

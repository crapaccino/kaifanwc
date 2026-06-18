(() => {
  const STATUS_ORDER = { exact: 0, winner: 1, alive: 2, wrong: 3, neutral: 4 };
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

  function setStatus(row, status) {
    row.classList.remove('perfect', 'close', 'wrong', 'neutral', 'exact-score');
    row.classList.add(status.cls);
    if (status.kind === 'exact') row.classList.add('exact-score');
    row.dataset.liveStatusRank = String(STATUS_ORDER[status.kind] ?? 99);

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
        const exactScore = predictedHome === currentHome && predictedAway === currentAway;
        const rightWinner = predictedWinner === currentWinner;
        const scoreStillAlive = currentHome <= predictedHome && currentAway <= predictedAway;

        if (exactScore) {
          setStatus(row, { kind: 'exact', cls: 'perfect', icon: '🥇', label: 'Perfect score' });
        } else if (rightWinner) {
          setStatus(row, { kind: 'winner', cls: 'perfect', icon: '✅', label: 'Right winner' });
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

(() => {
  const $ = selector => document.querySelector(selector);

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomScoreForWinner(winner) {
    if (winner === 'draw') {
      const score = randomInt(0, 3);
      return [score, score];
    }
    const loserScore = randomInt(0, 2);
    const winnerScore = randomInt(loserScore + 1, Math.min(loserScore + 4, 6));
    return winner === 'home' ? [winnerScore, loserScore] : [loserScore, winnerScore];
  }

  function currentRoundName() {
    const active = document.querySelector('#roundTabs button.active');
    return String(active?.dataset?.tab || active?.textContent || '').trim();
  }

  function isNormalRoundView() {
    const round = currentRoundName().toLowerCase();
    if (!round || round === 'live' || round === 'leaderboard') return false;
    if (document.querySelector('#lateRound2Btn.active')) return false;
    return !!document.querySelector('#matches .match [data-pick]');
  }

  function roundMatches() {
    return [...document.querySelectorAll('#matches .match')].filter(match => match.querySelector('[data-pick]'));
  }

  function setInputValue(input, value) {
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function randomizeAll() {
    const matches = roundMatches();
    matches.forEach(match => {
      const winner = ['home', 'draw', 'away'][randomInt(0, 2)];
      const [homeScore, awayScore] = randomScoreForWinner(winner);
      const winnerButton = match.querySelector(`[data-pick$=":${winner}"]`);
      if (winnerButton) winnerButton.click();
    });

    requestAnimationFrame(() => {
      roundMatches().forEach(match => {
        const buttons = [...match.querySelectorAll('[data-pick]')];
        const activeButton = buttons.find(button => button.classList.contains('active')) || buttons[randomInt(0, Math.max(buttons.length - 1, 0))];
        const winner = String(activeButton?.dataset?.pick || '').split(':')[1] || 'draw';
        const [homeScore, awayScore] = randomScoreForWinner(winner);
        const inputs = match.querySelectorAll('[data-score]');
        if (inputs[0]) setInputValue(inputs[0], homeScore);
        if (inputs[1]) setInputValue(inputs[1], awayScore);
      });
    });
  }

  function lockInPicks() {
    const submit = $('#submitBtn');
    if (submit && submit.style.display !== 'none') submit.click();
  }

  function addTopControls() {
    if (!isNormalRoundView()) return;
    if ($('#smoothRoundControls')) return;

    const matches = $('#matches');
    if (!matches) return;

    const controls = document.createElement('div');
    controls.id = 'smoothRoundControls';
    controls.className = 'action-bar smooth-round-top-actions';
    controls.innerHTML = '<button type="button" class="secondary" data-smooth-random>Random Pick All</button><button type="button" data-smooth-submit>Lock in picks</button>';
    matches.prepend(controls);

    controls.querySelector('[data-smooth-random]').onclick = randomizeAll;
    controls.querySelector('[data-smooth-submit]').onclick = lockInPicks;
  }

  function cleanupWrongView() {
    if (!isNormalRoundView()) $('#smoothRoundControls')?.remove();
  }

  let queued = false;
  function queueRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      cleanupWrongView();
      addTopControls();
    });
  }

  const observer = new MutationObserver(queueRefresh);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', queueRefresh);
})();

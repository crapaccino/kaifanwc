(() => {
  function isRoundTab(button) {
    const tab = button?.dataset?.tab;
    return tab && tab !== 'live' && tab !== 'leaderboard';
  }

  function cleanLabel(text) {
    return String(text || '').replace(/^🟢\s*/, '').replace(/^⚽\s*/, '').trim();
  }

  function updateCurrentRoundTabs() {
    document.querySelectorAll('#roundTabs button[data-tab]').forEach(button => {
      if (!isRoundTab(button)) return;
      const label = cleanLabel(button.textContent);
      button.textContent = '🟢 ' + label;
      button.classList.add('current-round-tab');
      button.title = 'Current prediction round is open';
    });
  }

  function start() {
    updateCurrentRoundTabs();
    const tabs = document.querySelector('#roundTabs');
    if (!tabs) return;
    new MutationObserver(updateCurrentRoundTabs).observe(tabs, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

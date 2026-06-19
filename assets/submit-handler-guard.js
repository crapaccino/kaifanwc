(() => {
  let mainSubmitHandler = null;

  function activeTabButton() {
    return document.querySelector('#roundTabs [data-tab].active');
  }

  function isNormalRoundActive() {
    const active = activeTabButton();
    if (!active) return false;
    const tab = active.dataset.tab;
    return tab && tab !== 'live' && tab !== 'leaderboard';
  }

  function isLateRoundActive() {
    return !!document.querySelector('#lateRound2Btn.active');
  }

  function restoreMainSubmit() {
    const submit = document.querySelector('#submitBtn');
    if (!submit || !mainSubmitHandler) return;
    if (!isNormalRoundActive() || isLateRoundActive()) return;
    if (submit.onclick !== mainSubmitHandler) submit.onclick = mainSubmitHandler;
    submit.style.display = 'block';
    submit.disabled = false;
    submit.textContent = 'Lock in picks';
  }

  window.addEventListener('load', () => {
    const submit = document.querySelector('#submitBtn');
    if (!submit) return;
    mainSubmitHandler = submit.onclick;
    document.addEventListener('click', () => {
      setTimeout(restoreMainSubmit, 0);
      setTimeout(restoreMainSubmit, 80);
      setTimeout(restoreMainSubmit, 250);
    }, true);
    const observer = new MutationObserver(() => setTimeout(restoreMainSubmit, 0));
    observer.observe(document.body, { childList: true, subtree: true });
    restoreMainSubmit();
  });
})();

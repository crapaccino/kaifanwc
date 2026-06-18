(() => {
  function isRoundOpen() {
    const active = document.querySelector('#roundTabs [data-tab].active');
    if (!active) return false;
    const tab = active.dataset.tab;
    return tab && tab !== 'leaderboard' && tab !== 'live';
  }

  function lockNow() {
    const submit = document.querySelector('#submitBtn');
    if (!submit || submit.style.display === 'none' || submit.disabled) return;
    submit.click();
  }

  function addTopLockButton() {
    if (!isRoundOpen()) return;

    const quickBox = document.querySelector('.quick-pick-all');
    const submit = document.querySelector('#submitBtn');
    if (!submit || submit.style.display === 'none') return;

    if (quickBox) {
      if (quickBox.querySelector('#topLockBtn')) return;
      const quickPickAll = quickBox.querySelector('#quickPickAllBtn');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'topLockBtn';
      btn.textContent = 'Lock in picks';
      btn.onclick = lockNow;
      if (quickPickAll) quickPickAll.insertAdjacentElement('afterend', btn);
      else quickBox.appendChild(btn);
      return;
    }

    const matches = document.querySelector('#matches');
    if (!matches || matches.querySelector('#topLockBtn')) return;
    const bar = document.createElement('div');
    bar.className = 'quick-pick-all round-lock open-notice';
    bar.innerHTML = '<div><b>Ready?</b><br><span class="small">Lock in your picks without scrolling.</span></div><button type="button" id="topLockBtn">Lock in picks</button>';
    const first = matches.querySelector('.day-header') || matches.firstChild;
    matches.insertBefore(bar, first);
    bar.querySelector('#topLockBtn').onclick = lockNow;
  }

  window.addEventListener('load', () => {
    addTopLockButton();
    setInterval(addTopLockButton, 500);
  });
})();

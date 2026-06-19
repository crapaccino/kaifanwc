(() => {
  const $ = selector => document.querySelector(selector);
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  let cache = null;
  let cacheAt = 0;

  async function api(path) {
    const response = await fetch('/.netlify/functions/' + path + (path.includes('?') ? '&' : '?') + 'ts=' + Date.now());
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }

  async function data() {
    const now = Date.now();
    if (cache && now - cacheAt < 5000) return cache;
    const nickname = normalize(localStorage.getItem('kaifanwc_name'));
    const [state, player] = await Promise.all([
      api('get-state'),
      nickname ? api('get-player?nickname=' + encodeURIComponent(nickname)).catch(() => ({ predictions: [] })) : Promise.resolve({ predictions: [] })
    ]);
    cache = { state, player, nickname };
    cacheAt = now;
    return cache;
  }

  function roundMatches(state, round) {
    return (state.matches || []).filter(match => match.round === round);
  }

  function savedIds(player) {
    return new Set((player.predictions || []).map(prediction => String(prediction.match_id)));
  }

  function activeRound() {
    const active = document.querySelector('#roundTabs [data-tab].active');
    if (!active) return null;
    const round = active.dataset.tab;
    if (!round || round === 'live' || round === 'leaderboard') return null;
    return round;
  }

  function removeOldBanner() {
    document.querySelector('#savedPicksBanner')?.remove();
  }

  async function update() {
    try {
      const tabs = $('#roundTabs');
      if (!tabs) return;
      const { state, player } = await data();
      const ids = savedIds(player);

      tabs.querySelectorAll('[data-tab]').forEach(button => {
        const round = button.dataset.tab;
        if (!round || round === 'live' || round === 'leaderboard') return;
        button.querySelector('.saved-tab-mark')?.remove();
        const total = roundMatches(state, round).length;
        if (!total) return;
        const saved = roundMatches(state, round).filter(match => ids.has(String(match.id))).length;
        if (saved > 0) {
          const mark = document.createElement('span');
          mark.className = 'saved-tab-mark';
          mark.textContent = saved === total ? ' ✓ Saved' : ` ✓ ${saved}/${total}`;
          button.appendChild(mark);
        }
      });

      removeOldBanner();
      const round = activeRound();
      if (!round) return;
      const matches = roundMatches(state, round);
      if (!matches.length) return;
      const saved = matches.filter(match => ids.has(String(match.id))).length;
      if (!saved) return;

      const banner = document.createElement('div');
      banner.id = 'savedPicksBanner';
      banner.className = 'round-lock saved-picks-banner';
      banner.innerHTML = saved === matches.length
        ? '<b>✅ Your picks are saved for this round.</b><br><span class="small">You have already submitted predictions for every match in this round.</span>'
        : `<b>✅ You have saved picks in this round.</b><br><span class="small">Saved ${saved} of ${matches.length} picks.</span>`;

      const notice = $('#matches .round-lock.open-notice');
      if (notice) notice.insertAdjacentElement('afterend', banner);
      else $('#matches')?.prepend(banner);
    } catch (_) {}
  }

  let queued = false;
  function queueUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  }

  window.addEventListener('load', queueUpdate);
  document.addEventListener('click', () => {
    cacheAt = 0;
    setTimeout(queueUpdate, 100);
    setTimeout(queueUpdate, 800);
  }, true);
  const observer = new MutationObserver(queueUpdate);
  observer.observe(document.body, { childList: true, subtree: true });
})();

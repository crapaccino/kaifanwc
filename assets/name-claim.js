(() => {
  function normalizeNickname(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  async function claimName(nickname) {
    const playerId = localStorage.getItem('kaifanwc_player_id') || '';
    const r = await fetch('/.netlify/functions/claim-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, player_id: playerId })
    });
    let j = {};
    try { j = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error(j.error || 'Name check failed.');
    if (j.player && j.player.id) localStorage.setItem('kaifanwc_player_id', String(j.player.id));
    return j;
  }

  window.addEventListener('load', () => {
    const btn = document.querySelector('#continueBtn');
    const input = document.querySelector('#welcomeName');
    const status = document.querySelector('#welcomeStatus');
    if (!btn || !input || btn.dataset.claimGuard === '1') return;

    const original = btn.onclick;
    btn.dataset.claimGuard = '1';

    btn.onclick = async () => {
      const nickname = normalizeNickname(input.value);
      if (!nickname) {
        if (status) status.textContent = 'Enter your name first.';
        return;
      }
      try {
        btn.disabled = true;
        if (status) status.textContent = 'Checking name...';
        await claimName(nickname);
        if (status) status.textContent = '';
        if (typeof original === 'function') await original();
      } catch (e) {
        if (status) status.innerHTML = '<span class="bad">' + e.message + '</span>';
      } finally {
        btn.disabled = false;
      }
    };
  });
})();

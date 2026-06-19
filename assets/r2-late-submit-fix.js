(() => {
  const norm = v => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
  async function post(path, payload) {
    const res = await fetch('/.netlify/functions/' + path, { method: 'POST', body: JSON.stringify(payload) });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Server route not ready yet. Wait for Vercel to finish redeploying, then refresh.'); }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
  function activeLate() {
    return document.querySelector('#lateRound2Btn.active') && document.querySelector('.late-round-match');
  }
  function rowPrediction(card) {
    const active = card.querySelector('[data-late-pick].active');
    const scores = card.querySelectorAll('[data-late-score]');
    if (!active || scores.length < 2) return null;
    const [id, winner] = active.dataset.latePick.split(':');
    const home = Number(scores[0].value);
    const away = Number(scores[1].value);
    if (!Number.isInteger(home) || !Number.isInteger(away)) return null;
    return { match_id: id, predicted_winner: winner, home_score: home, away_score: away };
  }
  async function submit() {
    const status = document.querySelector('#status');
    try {
      const cards = [...document.querySelectorAll('.late-round-match')];
      const predictions = cards.map(rowPrediction);
      if (predictions.some(x => !x)) throw new Error('Please predict every remaining Round 2 match before locking in your picks.');
      const nickname = norm(localStorage.getItem('kaifanwc_name'));
      const result = await post('r2-late', { nickname, predictions });
      if (status) status.innerHTML = `<span class="ok">Locked in ${result.saved} remaining Round 2 picks.</span>`;
      setTimeout(() => location.reload(), 700);
    } catch (e) {
      if (status) status.innerHTML = `<span class="bad">${e.message}</span>`;
    }
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-late-submit], #submitBtn');
    if (!btn || !activeLate()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    submit();
  }, true);
})();

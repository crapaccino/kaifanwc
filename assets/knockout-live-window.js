(() => {
  const KNOCKOUT_RE = /(round of 32|round of 16|quarter|semi|final)/i;
  let liveMeta = null;

  async function refreshMeta() {
    try {
      const response = await fetch('/.netlify/functions/get-live?ts=' + Date.now());
      liveMeta = await response.json();
    } catch (_) {
      liveMeta = null;
    }
  }

  function isKnockout(match) {
    return KNOCKOUT_RE.test(String(match?.round || '')) || KNOCKOUT_RE.test(String(match?.group_name || ''));
  }

  function isInsideExtraTimeWindow(match) {
    if (!match?.kickoff || !isKnockout(match)) return false;
    const elapsed = Date.now() - new Date(match.kickoff).getTime();
    return elapsed >= 2 * 60 * 60 * 1000 && elapsed < 3 * 60 * 60 * 1000;
  }

  function keepKnockoutLive() {
    const match = liveMeta?.match;
    if (!isInsideExtraTimeWindow(match)) return;

    document.querySelectorAll('.live-badge.full-time-badge').forEach(badge => {
      badge.classList.remove('full-time-badge');
      badge.textContent = 'LIVE / EXTRA TIME 🔴';
    });

    document.querySelectorAll('.full-time-note').forEach(note => {
      note.textContent = 'Extra time possible';
    });

    document.querySelectorAll('.status-chip').forEach(chip => {
      chip.textContent = chip.textContent
        .replace('Perfect final score', 'Perfect score')
        .replace('Wrong final result', 'Currently wrong');
    });
  }

  async function tick() {
    await refreshMeta();
    keepKnockoutLive();
  }

  const observer = new MutationObserver(keepKnockoutLive);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', tick);
  setInterval(tick, 30000);
})();

(() => {
  const LOCK_OFFSET_MS = 2 * 60 * 60 * 1000;
  let matches = [];

  const fmtFull = d => new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuwait",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(d));

  const roundMatches = round => matches
    .filter(m => m.round === round)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  const roundDeadline = round => {
    const games = roundMatches(round);
    if (!games.length) return null;
    return new Date(new Date(games[0].kickoff).getTime() - LOCK_OFFSET_MS);
  };

  function activeRoundName() {
    const active = document.querySelector('#roundTabs [data-tab].active');
    if (!active) return null;
    const label = active.textContent.trim();
    if (label.includes('Leaderboard') || label.includes('Live')) return null;

    const rounds = [...new Set(matches.map(m => m.round))];
    return rounds.find(r => String(r).includes(label) || label.includes(String(r).replace('Group Stage - ', '').replace('Group Stage ', ''))) || null;
  }

  function applyDeadline() {
    const round = activeRoundName();
    const notice = document.querySelector('.round-lock.open-notice');
    if (!round || !notice) return;

    const deadline = roundDeadline(round);
    if (!deadline) return;

    notice.innerHTML = `⏳ Predict every match in this round. Picks close <b>2 hours before the first kickoff</b>. Deadline: ${fmtFull(deadline)} Kuwait time.`;

    if (Date.now() >= deadline.getTime()) {
      const submitBtn = document.querySelector('#submitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.display = 'none';
      }
      const matchesEl = document.querySelector('#matches');
      if (matchesEl) {
        matchesEl.innerHTML = `<div class="notice"><b>This round is locked.</b><br><span class="small">Picks closed at ${fmtFull(deadline)} Kuwait time, 2 hours before the first kickoff.</span></div>`;
      }
    }
  }

  async function init() {
    try {
      const response = await fetch('/.netlify/functions/get-state');
      const data = await response.json();
      matches = Array.isArray(data.matches) ? data.matches : [];
    } catch (_) {
      matches = [];
    }

    const target = document.querySelector('#matches') || document.body;
    const observer = new MutationObserver(() => applyDeadline());
    observer.observe(target, { childList: true, subtree: true });
    applyDeadline();
    setInterval(applyDeadline, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
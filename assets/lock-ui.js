window.addEventListener('load', function () {
  var TWO_HOURS = 2 * 60 * 60 * 1000;
  var stateMatches = [];
  function fmt(d) {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
  }
  function getState() {
    fetch('/.netlify/functions/get-state').then(function (r) { return r.json(); }).then(function (j) {
      stateMatches = Array.isArray(j.matches) ? j.matches : [];
      apply();
    }).catch(function () {});
  }
  function activeRound() {
    var active = document.querySelector('#roundTabs [data-tab].active');
    if (!active) return null;
    var tab = active.getAttribute('data-tab') || '';
    if (tab === 'leaderboard' || tab === 'live') return null;
    return tab;
  }
  function deadlineFor(round) {
    var games = stateMatches.filter(function (m) { return m.round === round; }).sort(function (a, b) { return new Date(a.kickoff) - new Date(b.kickoff); });
    if (!games.length) return null;
    return new Date(new Date(games[0].kickoff).getTime() - TWO_HOURS);
  }
  function apply() {
    var round = activeRound();
    if (!round) return;
    var notice = document.querySelector('.round-lock.open-notice');
    var deadline = deadlineFor(round);
    if (!notice || !deadline) return;
    notice.textContent = 'Predict every match in this round. Picks close 2 hours before the first kickoff. Deadline: ' + fmt(deadline) + ' Kuwait time.';
    if (Date.now() >= deadline.getTime()) {
      var btn = document.querySelector('#submitBtn');
      if (btn) btn.style.display = 'none';
      var matches = document.querySelector('#matches');
      if (matches) matches.innerHTML = '<div class="notice"><b>This round is locked.</b><br><span class="small">Picks closed at ' + fmt(deadline) + ' Kuwait time.</span></div>';
    }
  }
  getState();
  new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  setInterval(apply, 30000);
});
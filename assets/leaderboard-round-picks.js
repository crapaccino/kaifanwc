(() => {
  let leaderboardByName = null;
  let loading = false;
  let refreshQueued = false;

  function normalize(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  async function loadLeaderboard() {
    if (leaderboardByName || loading) return;
    loading = true;
    try {
      const res = await fetch('/.netlify/functions/get-state');
      const data = await res.json();
      leaderboardByName = new Map((data.leaderboard || []).map(player => [normalize(player.nickname), player]));
    } catch (e) {
      leaderboardByName = new Map();
    } finally {
      loading = false;
    }
  }

  function patchTable() {
    const table = document.querySelector('.leaderboard-tab table');
    if (!table || !leaderboardByName) return;
    if (table.dataset.roundPicksSplit === '1') return;

    const headerCells = [...table.querySelectorAll('thead th')];
    const picksHeaderIndex = headerCells.findIndex(th => normalize(th.textContent) === 'picks');
    if (picksHeaderIndex === -1) return;

    headerCells[picksHeaderIndex].textContent = 'R2 Picks';
    const r3Header = document.createElement('th');
    r3Header.textContent = 'R3 Picks';
    headerCells[picksHeaderIndex].after(r3Header);

    table.querySelectorAll('tbody tr').forEach(row => {
      const cells = [...row.children];
      if (cells.length < 4) return;
      const player = leaderboardByName.get(normalize(cells[1].textContent));
      const r2 = player?.round2_predictions ?? 0;
      const r3 = player?.round3_predictions ?? 0;
      cells[picksHeaderIndex].textContent = r2;
      const r3Cell = document.createElement('td');
      r3Cell.textContent = r3;
      cells[picksHeaderIndex].after(r3Cell);
    });

    table.dataset.roundPicksSplit = '1';
  }

  async function refresh() {
    await loadLeaderboard();
    patchTable();
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      refresh();
    });
  }

  const observer = new MutationObserver(queueRefresh);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', queueRefresh);
})();

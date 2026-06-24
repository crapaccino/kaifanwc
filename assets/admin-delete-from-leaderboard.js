(() => {
  function $(selector) { return document.querySelector(selector); }

  function safe(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  async function callAdmin(path, body) {
    const pass = $('#adminPass') ? $('#adminPass').value : '';
    const response = await fetch('/.netlify/functions/' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': pass
      },
      body: JSON.stringify(body || {})
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error(text.slice(0, 160) || 'Server returned a non-JSON response'); }
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function getNames() {
    const names = new Set();

    document.querySelectorAll('#leaderboard table tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      const name = cells[1] ? cells[1].textContent.trim() : '';
      if (name) names.add(name);
    });

    document.querySelectorAll('.admin-predictions-table tbody tr').forEach(row => {
      const bold = row.querySelector('td b');
      const name = bold ? bold.textContent.trim() : '';
      if (name) names.add(name);
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  function getRounds() {
    const rounds = new Set();
    document.querySelectorAll('.admin-predictions-table tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      const round = cells[1] ? cells[1].textContent.trim() : '';
      if (round) rounds.add(round);
    });
    return Array.from(rounds).sort((a, b) => a.localeCompare(b));
  }

  function addPanel() {
    const tableWrap = $('#predictionsTable');
    if (!tableWrap || $('#deletePlayerPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'deletePlayerPanel';
    panel.className = 'notice';
    panel.innerHTML = `
      <b>Delete test player</b><br>
      <span class="small">Deletes the player, their predictions, and bonus picks.</span>
      <div class="row" style="margin-top:10px">
        <select id="deletePlayerSelect"><option value="">Load predictions first</option></select>
        <button type="button" class="danger" id="deletePlayerBtn">Delete player</button>
      </div>
    `;
    tableWrap.parentNode.insertBefore(panel, tableWrap);

    const unlockPanel = document.createElement('div');
    unlockPanel.id = 'unlockPlayerRoundPanel';
    unlockPanel.className = 'notice';
    unlockPanel.innerHTML = `
      <b>Unlock player round</b><br>
      <span class="small">Removes only this player’s picks for one round before the deadline. Everyone else stays locked.</span>
      <div class="row" style="margin-top:10px">
        <select id="unlockPlayerSelect"><option value="">Load predictions first</option></select>
        <select id="unlockRoundSelect"><option value="">Load predictions first</option></select>
        <button type="button" class="danger" id="unlockPlayerRoundBtn">Unlock round</button>
      </div>
      <span class="small">After unlocking, ask the player to refresh, edit, and press Lock in picks again.</span>
    `;
    tableWrap.parentNode.insertBefore(unlockPanel, tableWrap);

    $('#deletePlayerBtn').onclick = async () => {
      const select = $('#deletePlayerSelect');
      const nickname = select ? select.value : '';
      const status = $('#adminStatus');
      if (!nickname) {
        if (status) status.innerHTML = '<span class="bad">Choose a player first.</span>';
        return;
      }
      if (!confirm(`Delete ${nickname} and all their picks? This cannot be undone.`)) return;
      try {
        if (status) status.textContent = 'Deleting player...';
        await callAdmin('admin-delete-player', { nickname });
        if (status) status.innerHTML = `<span class="ok">Deleted ${safe(nickname)}.</span>`;
        const loadBtn = $('#loadPredictions');
        if (loadBtn) loadBtn.click();
        setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        if (status) status.innerHTML = `<span class="bad">${safe(error.message)}</span>`;
      }
    };

    $('#unlockPlayerRoundBtn').onclick = async () => {
      const nickname = $('#unlockPlayerSelect') ? $('#unlockPlayerSelect').value : '';
      const round = $('#unlockRoundSelect') ? $('#unlockRoundSelect').value : '';
      const status = $('#adminStatus');
      if (!nickname || !round) {
        if (status) status.innerHTML = '<span class="bad">Choose a player and round first.</span>';
        return;
      }
      if (!confirm(`Unlock ${nickname}'s ${round} picks? They will need to lock in again.`)) return;
      try {
        if (status) status.textContent = 'Unlocking round...';
        const result = await callAdmin('admin-unlock-round', { nickname, round });
        if (status) status.innerHTML = `<span class="ok">Unlocked ${safe(nickname)} for ${safe(round)}. Removed ${result.deleted || 0} picks.</span>`;
        const loadBtn = $('#loadPredictions');
        if (loadBtn) loadBtn.click();
      } catch (error) {
        if (status) status.innerHTML = `<span class="bad">${safe(error.message)}</span>`;
      }
    };
  }

  function refreshDeleteList() {
    addPanel();
    const deleteSelect = $('#deletePlayerSelect');
    const unlockPlayerSelect = $('#unlockPlayerSelect');
    const unlockRoundSelect = $('#unlockRoundSelect');

    const names = getNames();
    const nameOptions = names.length
      ? '<option value="">Choose player...</option>' + names.map(name => `<option value="${safe(name)}">${safe(name)}</option>`).join('')
      : '<option value="">No players loaded</option>';

    [deleteSelect, unlockPlayerSelect].forEach(select => {
      if (!select) return;
      const current = select.value;
      select.innerHTML = nameOptions;
      if (current && names.includes(current)) select.value = current;
    });

    if (unlockRoundSelect) {
      const currentRound = unlockRoundSelect.value;
      const rounds = getRounds();
      unlockRoundSelect.innerHTML = rounds.length
        ? '<option value="">Choose round...</option>' + rounds.map(round => `<option value="${safe(round)}">${safe(round)}</option>`).join('')
        : '<option value="">No rounds loaded</option>';
      if (currentRound && rounds.includes(currentRound)) unlockRoundSelect.value = currentRound;
    }
  }

  window.addEventListener('load', () => {
    refreshDeleteList();
    setInterval(refreshDeleteList, 1500);
  });
})();

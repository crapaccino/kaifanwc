(() => {
  const $ = s => document.querySelector(s);

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

  function uniquePlayersFromPredictions() {
    const rows = [...document.querySelectorAll('.admin-predictions-table tbody tr')];
    const names = new Set();
    rows.forEach(row => {
      const name = row.querySelector('td b') ? row.querySelector('td b').textContent.trim() : '';
      if (name) names.add(name);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  function addDeletePanel() {
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

    panel.querySelector('#deletePlayerBtn').onclick = async () => {
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
        if (status) status.innerHTML = `<span class="ok">Deleted ${nickname}.</span>`;
        const loadBtn = $('#loadPredictions');
        if (loadBtn) loadBtn.click();
        setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        if (status) status.innerHTML = `<span class="bad">${error.message}</span>`;
      }
    };
  }

  function refreshDeleteOptions() {
    addDeletePanel();
    const select = $('#deletePlayerSelect');
    if (!select) return;
    const names = uniquePlayersFromPredictions();
    select.innerHTML = names.length
      ? '<option value="">Choose player...</option>' + names.map(n => `<option value="${n.replaceAll('&','&amp;').replaceAll('"','&quot;')}">${n}</option>`).join('')
      : '<option value="">No players loaded</option>';
  }

  window.addEventListener('load', () => {
    refreshDeleteOptions();
    setInterval(refreshDeleteOptions, 1000);
  });
})();

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
  }

  function refreshDeleteList() {
    addPanel();
    const select = $('#deletePlayerSelect');
    if (!select) return;

    const current = select.value;
    const names = getNames();
    select.innerHTML = names.length
      ? '<option value="">Choose player...</option>' + names.map(name => `<option value="${safe(name)}">${safe(name)}</option>`).join('')
      : '<option value="">No players loaded</option>';
    if (current && names.includes(current)) select.value = current;
  }

  window.addEventListener('load', () => {
    refreshDeleteList();
    setInterval(refreshDeleteList, 1500);
  });
})();

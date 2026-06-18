(() => {
  const $ = s => document.querySelector(s);

  async function callAdmin(path, body) {
    const response = await fetch('/.netlify/functions/' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': $('#adminPass') ? $('#adminPass').value : ''
      },
      body: JSON.stringify(body || {})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function playerNames() {
    const rows = [...document.querySelectorAll('.admin-predictions-table tbody tr')];
    const names = new Set();
    rows.forEach(row => {
      const name = row.querySelector('td b') ? row.querySelector('td b').textContent.trim() : '';
      if (name) names.add(name);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  function esc(value) {
    return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  }

  function addPanel() {
    const predictionsTable = $('#predictionsTable');
    if (!predictionsTable || $('#recoveryPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'recoveryPanel';
    panel.className = 'notice';
    panel.innerHTML = `
      <b>Account recovery</b><br>
      <span class="small">Generate a code for someone who lost their browser/device.</span>
      <div class="row" style="margin-top:10px">
        <select id="recoveryPlayerSelect"><option value="">Load predictions first</option></select>
        <button type="button" class="secondary" id="generateRecoveryBtn">Generate recovery code</button>
      </div>
      <p class="small" id="recoveryResult"></p>
    `;
    predictionsTable.parentNode.insertBefore(panel, predictionsTable);

    panel.querySelector('#generateRecoveryBtn').onclick = async () => {
      const select = $('#recoveryPlayerSelect');
      const nickname = select ? select.value : '';
      const result = $('#recoveryResult');
      if (!nickname) {
        if (result) result.innerHTML = '<span class="bad">Choose a player first.</span>';
        return;
      }
      try {
        if (result) result.textContent = 'Generating...';
        const data = await callAdmin('admin-recovery-code', { nickname });
        if (result) result.innerHTML = `<span class="ok">Code for ${esc(data.nickname)}: <b>${esc(data.recovery_code)}</b></span>`;
      } catch (error) {
        if (result) result.innerHTML = `<span class="bad">${esc(error.message)}</span>`;
      }
    };
  }

  function refreshOptions() {
    addPanel();
    const select = $('#recoveryPlayerSelect');
    if (!select) return;
    const current = select.value;
    const names = playerNames();
    select.innerHTML = names.length
      ? '<option value="">Choose player...</option>' + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')
      : '<option value="">No players loaded</option>';
    if (current && names.includes(current)) select.value = current;
  }

  window.addEventListener('load', () => {
    refreshOptions();
    setInterval(refreshOptions, 1500);
  });
})();

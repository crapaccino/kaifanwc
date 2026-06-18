(() => {
  const $ = s => document.querySelector(s);

  function esc(value) {
    return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  }

  async function recover(nickname, code) {
    const response = await fetch('/.netlify/functions/recover-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, code })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Recovery failed');
    return data;
  }

  function addRecoveryBox() {
    const card = document.querySelector('.welcome-card');
    if (!card || $('#recoverBox')) return;

    const box = document.createElement('div');
    box.id = 'recoverBox';
    box.className = 'welcome-note';
    box.innerHTML = `
      <button type="button" class="secondary" id="showRecoverBtn" style="width:100%;margin-bottom:8px">Recover account</button>
      <div id="recoverForm" class="app-hidden">
        <input id="recoverName" placeholder="Existing nickname" autocomplete="off">
        <input id="recoverCode" placeholder="Recovery code" autocomplete="off" style="margin-top:8px">
        <button type="button" id="recoverBtn" style="width:100%;margin-top:8px">Recover this account</button>
        <p class="small" id="recoverStatus"></p>
      </div>
    `;
    card.appendChild(box);

    $('#showRecoverBtn').onclick = () => $('#recoverForm').classList.toggle('app-hidden');
    $('#recoverBtn').onclick = async () => {
      const status = $('#recoverStatus');
      const nickname = $('#recoverName').value.trim();
      const code = $('#recoverCode').value.trim();
      if (!nickname || !code) {
        status.innerHTML = '<span class="bad">Enter nickname and recovery code.</span>';
        return;
      }
      try {
        status.textContent = 'Recovering...';
        const data = await recover(nickname, code);
        localStorage.setItem('kaifanwc_name', data.nickname);
        localStorage.setItem('kaifanwc_name_locked', '1');
        status.innerHTML = `<span class="ok">Recovered ${esc(data.nickname)}. Reloading...</span>`;
        setTimeout(() => window.location.reload(), 700);
      } catch (error) {
        status.innerHTML = `<span class="bad">${esc(error.message)}</span>`;
      }
    };
  }

  window.addEventListener('load', addRecoveryBox);
})();

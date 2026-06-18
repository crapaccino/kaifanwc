async function callSyncResults() {
  const status = document.querySelector('#adminStatus');
  const pass = document.querySelector('#adminPass');
  try {
    status.textContent = 'Syncing live / final scores...';
    const response = await fetch('/.netlify/functions/sync-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': pass ? pass.value : ''
      },
      body: JSON.stringify({})
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error(text.slice(0, 160) || 'Server returned a non-JSON response'); }
    if (!response.ok) throw new Error(data.error || 'Score sync failed');
    status.innerHTML = `<span class="ok">Score sync complete. Updated ${data.updated} match${data.updated === 1 ? '' : 'es'}.</span>`;
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    status.innerHTML = `<span class="bad">${error.message}</span>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('#syncResults');
  if (btn) btn.addEventListener('click', callSyncResults);
});

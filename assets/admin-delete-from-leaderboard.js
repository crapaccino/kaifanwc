(() => {
  function optionSafe(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
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

  function refreshDeleteList() {
    const select = document.querySelector('#deletePlayerSelect');
    if (!select) return;

    const current = select.value;
    const names = getNames();
    if (!names.length) return;

    const html = '<option value="">Choose player...</option>' +
      names.map(name => `<option value="${optionSafe(name)}">${optionSafe(name)}</option>`).join('');

    if (select.innerHTML !== html) select.innerHTML = html;
    if (current && names.includes(current)) select.value = current;
  }

  window.addEventListener('load', () => {
    setInterval(refreshDeleteList, 600);
  });
})();

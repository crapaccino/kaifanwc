(() => {
  let chosen = '';

  function selectBox() {
    return document.querySelector('#deletePlayerSelect');
  }

  function rememberChoice() {
    const box = selectBox();
    if (box && box.value) chosen = box.value;
  }

  function restoreChoice() {
    const box = selectBox();
    if (!box || !chosen) return;
    const exists = Array.from(box.options).some(option => option.value === chosen);
    if (exists && box.value !== chosen) box.value = chosen;
  }

  document.addEventListener('change', event => {
    if (event.target && event.target.id === 'deletePlayerSelect') rememberChoice();
  });

  window.addEventListener('load', () => {
    setInterval(restoreChoice, 200);
  });
})();

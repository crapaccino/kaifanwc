(() => {
  document.addEventListener('click', event => {
    const quickAll = event.target && event.target.closest ? event.target.closest('#quickPickAllBtn') : null;
    if (!quickAll) return;
    setTimeout(() => {
      const box = quickAll.closest('.quick-pick-all');
      if (box) box.classList.add('quick-pick-picked');
    }, 300);
  }, true);
})();

(() => {
  function dedupeLateTabs() {
    const tabs = document.querySelector('#roundTabs');
    if (!tabs) return;
    const lateButtons = [...tabs.querySelectorAll('#lateRound2Btn')];
    lateButtons.slice(1).forEach(button => button.remove());
  }

  window.addEventListener('load', () => {
    dedupeLateTabs();
    setInterval(dedupeLateTabs, 150);
  });

  const observer = new MutationObserver(dedupeLateTabs);
  observer.observe(document.body, { childList: true, subtree: true });
})();

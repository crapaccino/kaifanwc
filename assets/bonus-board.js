(() => {
  const pretty = v => String(v || '').replace(/\b\w/g, c => c.toUpperCase());
  async function addBoard(){
    const target = document.querySelector('.leaderboard-tab');
    if(!target || target.querySelector('.bonus-board')) return;
    const res = await fetch('/.netlify/functions/get-state');
    const data = await res.json();
    const grouped = {};
    (data.bonus_predictions || []).forEach(x => {
      if(!grouped[x.nickname]) grouped[x.nickname] = {};
      grouped[x.nickname][x.category] = x.pick;
    });
    const names = Object.keys(grouped).sort();
    const body = names.map(name => {
      const p = grouped[name];
      return '<tr><td><b>'+pretty(name)+'</b></td><td>'+(p.winner||'-')+'</td><td>'+(p.potm||'-')+'</td><td>'+(p.golden_boot||'-')+'</td><td>'+(p.golden_glove||'-')+'</td></tr>';
    }).join('') || '<tr><td colspan="5">No bonus predictions locked yet.</td></tr>';
    target.insertAdjacentHTML('beforeend','<div class="bonus-card bonus-board"><h2>Tournament Predictions</h2><p class="bonus-note">Locked bonus picks for the end of the tournament.</p><table><thead><tr><th>Name</th><th>Winner</th><th>POTM</th><th>Golden Boot</th><th>Golden Glove</th></tr></thead><tbody>'+body+'</tbody></table></div>');
  }
  window.addEventListener('load', () => { setInterval(addBoard, 1000); addBoard(); });
})();
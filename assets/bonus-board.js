(() => {
  const pretty = v => String(v || '').replace(/\b\w/g, c => c.toUpperCase());
  const SHORT = {
    'France':'🇫🇷','England':'🏴','Spain':'🇪🇸','Argentina':'🇦🇷','Brazil':'🇧🇷','Any Other Team':'🌍 Other',
    'Kylian Mbappe':'🇫🇷 KM','Lamine Yamal':'🇪🇸 LY','Harry Kane':'🏴 HK','Lionel Messi':'🇦🇷 LM','Michael Olise':'🇫🇷 MO','Any Other Player':'👤 Other',
    'Erling Haaland':'🇳🇴 EH','Kai Havertz':'🇩🇪 KH',
    'Mike Maignan':'🇫🇷 MM','Emiliano Martinez':'🇦🇷 EM','Jordan Pickford':'🏴 JP','Unai Simon':'🇪🇸 US','Alisson Becker':'🇧🇷 AB','Any Other Goalkeeper':'🧤 Other'
  };
  const compact = v => SHORT[v] || (v || '-');
  async function addBoard(){
    const target = document.querySelector('.leaderboard-tab');
    if(!target) return;
    const res = await fetch('/.netlify/functions/get-state?ts=' + Date.now());
    const data = await res.json();
    const grouped = {};
    (data.bonus_predictions || []).forEach(x => {
      if(!grouped[x.nickname]) grouped[x.nickname] = {};
      grouped[x.nickname][x.category] = x.pick;
    });
    const names = Object.keys(grouped).sort();
    const body = names.map(name => {
      const p = grouped[name];
      return '<tr><td><b>'+pretty(name)+'</b></td><td>'+compact(p.winner)+'</td><td>'+compact(p.potm)+'</td><td>'+compact(p.golden_boot)+'</td><td>'+compact(p.golden_glove)+'</td></tr>';
    }).join('') || '<tr><td colspan="5">No bonus predictions locked yet.</td></tr>';
    const html = '<h2>Tournament Predictions</h2><p class="bonus-note">Locked bonus picks. 🌍 Other = any unlisted team, 👤 Other = any unlisted player, 🧤 Other = any unlisted goalkeeper.</p><table><thead><tr><th>Name</th><th>Winner</th><th>POTM</th><th>Boot</th><th>Glove</th></tr></thead><tbody>'+body+'</tbody></table>';
    let board = target.querySelector('.bonus-board');
    if(!board){
      target.insertAdjacentHTML('beforeend','<div class="bonus-card bonus-board">'+html+'</div>');
    }else{
      board.innerHTML = html;
    }
  }
  window.addEventListener('load', () => { setInterval(addBoard, 3000); addBoard(); });
})();
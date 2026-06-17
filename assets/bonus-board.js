(() => {
  const pretty = v => String(v || '').replace(/\b\w/g, c => c.toUpperCase());
  const flagImg = code => code ? '<img class="team-flag-img" src="https://flagcdn.com/'+code+'.svg" alt="" loading="lazy">' : '';
  const withFlag = (code, text) => '<span class="bonus-compact-pick"><span class="pick-label-flag">'+flagImg(code)+'</span><span>'+text+'</span></span>';
  const SHORT = {
    'France':withFlag('fr','FR'),'England':withFlag('gb-eng','ENG'),'Spain':withFlag('es','ESP'),'Argentina':withFlag('ar','ARG'),'Brazil':withFlag('br','BRA'),'Any Other Team':'Other',
    'Kylian Mbappe':withFlag('fr','KM'),'Lamine Yamal':withFlag('es','LY'),'Harry Kane':withFlag('gb-eng','HK'),'Lionel Messi':withFlag('ar','LM'),'Michael Olise':withFlag('fr','MO'),'Any Other Player':'Other',
    'Erling Haaland':withFlag('no','EH'),'Kai Havertz':withFlag('de','KH'),
    'Mike Maignan':withFlag('fr','MM'),'Emiliano Martinez':withFlag('ar','EM'),'Jordan Pickford':withFlag('gb-eng','JP'),'Unai Simon':withFlag('es','US'),'Alisson Becker':withFlag('br','AB'),'Any Other Goalkeeper':'Other'
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
      return '<tr><td><b>'+pretty(name)+'</b> <span title="Tournament predictions locked">🔒</span></td><td>'+compact(p.winner)+'</td><td>'+compact(p.potm)+'</td><td>'+compact(p.golden_boot)+'</td><td>'+compact(p.golden_glove)+'</td></tr>';
    }).join('') || '<tr><td colspan="5">No bonus predictions locked yet.</td></tr>';
    const html = '<h2>🔒 Tournament Predictions</h2><p class="bonus-note">Locked bonus picks. Other = any unlisted team, player, or goalkeeper.</p><table><thead><tr><th>Name</th><th>Winner</th><th>POTM</th><th>Boot</th><th>Glove</th></tr></thead><tbody>'+body+'</tbody></table>';
    let board = target.querySelector('.bonus-board');
    if(!board){
      target.insertAdjacentHTML('beforeend','<div class="bonus-card bonus-board">'+html+'</div>');
    }else{
      board.innerHTML = html;
    }
  }
  window.addEventListener('load', () => { setInterval(addBoard, 3000); addBoard(); });
})();
(() => {
  const BONUS_PREDICTIONS_CLOSED = true;
  const FLAG_CODES = { France:'fr', England:'gb-eng', Spain:'es', Argentina:'ar', Brazil:'br', Norway:'no', Germany:'de' };
  const flagImg = code => code ? '<img class="team-flag-img" src="https://flagcdn.com/'+code+'.svg" alt="" loading="lazy">' : '';
  const pickLabel = opt => opt.code ? '<span class="pick-label-flag">'+flagImg(opt.code)+'</span><span>'+opt.label+'</span>' : '<span>'+opt.label+'</span>';

  const CATEGORIES = [
    { key:'winner', title:'World Cup Winner', points:15, options:[
      {name:'France',label:'France',code:FLAG_CODES.France,chance:'18%'},{name:'England',label:'England',code:FLAG_CODES.England,chance:'16%'},{name:'Spain',label:'Spain',code:FLAG_CODES.Spain,chance:'14%'},{name:'Argentina',label:'Argentina',code:FLAG_CODES.Argentina,chance:'13%'},{name:'Brazil',label:'Brazil',code:FLAG_CODES.Brazil,chance:'11%'},{name:'Any Other Team',label:'Any Other Team',chance:'28%'}
    ]},
    { key:'potm', title:'Player of the Tournament', points:10, options:[
      {name:'Kylian Mbappe',label:'Mbappé',code:FLAG_CODES.France,chance:'18%'},{name:'Lamine Yamal',label:'Yamal',code:FLAG_CODES.Spain,chance:'15%'},{name:'Harry Kane',label:'Kane',code:FLAG_CODES.England,chance:'13%'},{name:'Lionel Messi',label:'Messi',code:FLAG_CODES.Argentina,chance:'12%'},{name:'Michael Olise',label:'Olise',code:FLAG_CODES.France,chance:'8%'},{name:'Any Other Player',label:'Any Other Player',chance:'34%'}
    ]},
    { key:'golden_boot', title:'Golden Boot', points:10, options:[
      {name:'Kylian Mbappe',label:'Mbappé',code:FLAG_CODES.France,chance:'20%'},{name:'Harry Kane',label:'Kane',code:FLAG_CODES.England,chance:'15%'},{name:'Erling Haaland',label:'Haaland',code:FLAG_CODES.Norway,chance:'12%'},{name:'Lionel Messi',label:'Messi',code:FLAG_CODES.Argentina,chance:'10%'},{name:'Kai Havertz',label:'Havertz',code:FLAG_CODES.Germany,chance:'8%'},{name:'Any Other Player',label:'Any Other Player',chance:'35%'}
    ]},
    { key:'golden_glove', title:'Golden Glove', points:8, options:[
      {name:'Mike Maignan',label:'Maignan',code:FLAG_CODES.France,chance:'16%'},{name:'Emiliano Martinez',label:'Martínez',code:FLAG_CODES.Argentina,chance:'15%'},{name:'Jordan Pickford',label:'Pickford',code:FLAG_CODES.England,chance:'13%'},{name:'Unai Simon',label:'Unai Simón',code:FLAG_CODES.Spain,chance:'12%'},{name:'Alisson Becker',label:'Alisson',code:FLAG_CODES.Brazil,chance:'10%'},{name:'Any Other Goalkeeper',label:'Any Other Goalkeeper',chance:'34%'}
    ]}
  ];

  let syncing = false;
  const SAVE_ENDPOINT = 'bonus-predictions';
  const storeKey = () => 'kaifanwc_bonus_' + (localStorage.getItem('kaifanwc_name') || 'guest');
  const lockKey = () => storeKey() + '_locked';
  const readPicks = () => { try { return JSON.parse(localStorage.getItem(storeKey()) || '{}'); } catch (_) { return {}; } };
  const writePicks = p => localStorage.setItem(storeKey(), JSON.stringify(p));
  const isLocked = () => localStorage.getItem(lockKey()) === '1';
  const nickname = () => String(localStorage.getItem('kaifanwc_name') || '').trim().toLowerCase();

  async function api(path, opts={}){
    const r = await fetch('/.netlify/functions/' + path, opts);
    let j = {};
    try { j = await r.json(); } catch(_) {}
    if(!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  }

  async function loadRemoteBonus(){
    const name = nickname();
    if(!name) return;
    try{
      const player = await api('get-player?nickname=' + encodeURIComponent(name));
      const rows = player.bonus_predictions || [];
      if(rows.length){
        const remote = {};
        rows.forEach(r => remote[r.category] = r.pick);
        writePicks(remote);
        localStorage.setItem(lockKey(), '1');
      }
    }catch(_){ }
  }

  async function savePicks(p){
    return api(SAVE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:nickname(),picks:p})});
  }

  async function syncLockedPicks(){
    if(BONUS_PREDICTIONS_CLOSED || syncing || !isLocked() || !nickname()) return;
    const p = readPicks();
    const missing = CATEGORIES.find(c => !p[c.key] || !String(p[c.key]).trim());
    if(missing) return;
    syncing = true;
    try{ await savePicks(p); }catch(_){ } finally { syncing = false; }
  }

  function ensureTab() {
    const tabs = document.querySelector('#roundTabs');
    if (!tabs || tabs.querySelector('[data-bonus-tab="bonus"]')) return;
    const leader = tabs.querySelector('[data-tab="leaderboard"]');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Predictions';
    btn.setAttribute('data-bonus-tab','bonus');
    btn.onclick = renderBonus;
    if (leader) tabs.insertBefore(btn, leader); else tabs.appendChild(btn);
  }

  function updateTabLabel(){
    const b = document.querySelector('[data-bonus-tab="bonus"]');
    if(b) b.textContent = 'Predictions';
  }

  function clearActiveTabs() {
    document.querySelectorAll('#roundTabs button').forEach(b => b.classList.remove('active'));
    const b = document.querySelector('[data-bonus-tab="bonus"]');
    if (b) b.classList.add('active');
  }

  function selectedSummary(picks){
    const rows = CATEGORIES.map(cat => {
      const opt = cat.options.find(o => o.name === picks[cat.key]);
      if(!opt) return '';
      return '<div class="bonus-locked-row"><span>'+cat.title+'</span><b>'+(opt.code ? '<span class="bonus-option-main">'+pickLabel(opt)+'</span>' : opt.label)+'</b></div>';
    }).join('');
    if(!rows) return '';
    return '<div class="bonus-card bonus-locked-summary"><h2>Tournament Predictions Saved</h2><p class="bonus-note">Your saved tournament bonus picks are shown below. Tournament bonus predictions are now closed, so they can no longer be changed.</p>'+rows+'</div>';
  }

  function renderCategory(cat, picks) {
    const val = picks[cat.key] || '';
    return '<div class="bonus-card">' +
      '<h3>'+cat.title+' — '+cat.points+' pts</h3>' +
      '<p class="bonus-note">'+(BONUS_PREDICTIONS_CLOSED ? 'Voting is closed for this category.' : 'Choose one favourite, or pick the field option to cover everyone not listed.')+'</p>' +
      '<div class="bonus-grid">' +
      cat.options.map(opt => '<button type="button" class="bonus-option '+(val===opt.name?'active':'')+'" data-bonus-pick="'+cat.key+'" data-value="'+opt.name+'" '+(BONUS_PREDICTIONS_CLOSED?'disabled aria-disabled="true"':'')+'><span class="bonus-option-main">'+pickLabel(opt)+'</span><span class="bonus-rank">'+opt.chance+'</span></button>').join('') +
      '</div></div>';
  }

  function renderBonus() {
    try{
      updateTabLabel();
      clearActiveTabs();
      const matches = document.querySelector('#matches');
      const submitBtn = document.querySelector('#submitBtn');
      if (submitBtn) submitBtn.style.display = 'none';
      if (!matches) return;
      const picks = readPicks();
      if(isLocked()) syncLockedPicks();

      if(BONUS_PREDICTIONS_CLOSED){
        matches.innerHTML = selectedSummary(picks) + '<div class="bonus-card"><h2>Tournament Bonus Predictions Closed</h2><p class="bonus-note">Voting is closed. Existing saved picks remain visible, but no one can submit, clear, or change tournament bonus predictions anymore.</p></div>' +
          CATEGORIES.map(c => renderCategory(c, picks)).join('');
        return;
      }

      matches.innerHTML = selectedSummary(picks) + '<div class="bonus-card"><h2>Bonus Predictions Reopened</h2><p class="bonus-note">Tournament bonus predictions are open until further notice. You can submit them now, or change your previous bonus picks and save again.</p></div>' +
        CATEGORIES.map(c => renderCategory(c, picks)).join('') +
        '<div class="bonus-card"><div class="bonus-actions"><button id="lockBonusBtn">'+(isLocked()?'Save updated bonus predictions':'Save bonus predictions')+'</button><button id="clearBonusBtn" class="secondary">Clear bonus picks</button></div><p class="bonus-status" id="bonusStatus">'+(isLocked()?'<span class="ok">Your current tournament predictions are saved. You can still change them while bonus picks are reopened.</span>':'Pick all 4 categories, then save them.')+'</p></div>';
      document.querySelectorAll('[data-bonus-pick]').forEach(btn => btn.onclick = () => { const p = readPicks(); p[btn.dataset.bonusPick] = btn.dataset.value; writePicks(p); renderBonus(); });
      const lock = document.querySelector('#lockBonusBtn');
      if (lock) lock.onclick = async () => {
        try{
          const p = readPicks();
          const missing = CATEGORIES.find(c => !p[c.key] || !String(p[c.key]).trim());
          if (missing) { document.querySelector('#bonusStatus').innerHTML = '<span class="bad">Choose a pick for '+missing.title+'.</span>'; return; }
          if(!nickname()) throw new Error('Enter your name first.');
          lock.disabled = true;
          document.querySelector('#bonusStatus').textContent = 'Saving bonus predictions...';
          await savePicks(p);
          localStorage.setItem(lockKey(), '1');
          updateTabLabel();
          renderBonus();
        }catch(e){ lock.disabled = false; document.querySelector('#bonusStatus').innerHTML = '<span class="bad">'+e.message+'</span>'; }
      };
      const clear = document.querySelector('#clearBonusBtn');
      if (clear) clear.onclick = () => { localStorage.removeItem(storeKey()); localStorage.removeItem(lockKey()); updateTabLabel(); renderBonus(); };
    }catch(e){
      const matches = document.querySelector('#matches');
      if(matches) matches.innerHTML = '<div class="bonus-card"><h2>Bonus Predictions</h2><p class="bonus-status"><span class="bad">'+e.message+'</span></p></div>';
    }
  }

  async function start() {
    await loadRemoteBonus();
    ensureTab();
    updateTabLabel();
    const tabs = document.querySelector('#roundTabs');
    if (tabs) new MutationObserver(()=>{ensureTab(); updateTabLabel();}).observe(tabs, { childList:true });
    setInterval(()=>{ updateTabLabel(); const b=document.querySelector('[data-bonus-tab="bonus"]'); if(b && b.classList.contains('active')) renderBonus(); }, 30000);
  }
  window.addEventListener('load', start);
})();
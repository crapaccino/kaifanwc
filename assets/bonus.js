(() => {
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

  let deadline = null;
  let syncing = false;
  const SAVE_ENDPOINT = 'bonus-predictions';
  const storeKey = () => 'kaifanwc_bonus_' + (localStorage.getItem('kaifanwc_name') || 'guest');
  const lockKey = () => storeKey() + '_locked';
  const readPicks = () => { try { return JSON.parse(localStorage.getItem(storeKey()) || '{}'); } catch (_) { return {}; } };
  const writePicks = p => localStorage.setItem(storeKey(), JSON.stringify(p));
  const isLocked = () => localStorage.getItem(lockKey()) === '1';
  const nickname = () => String(localStorage.getItem('kaifanwc_name') || '').trim().toLowerCase();
  const isClosed = () => deadline && Date.now() >= deadline.getTime();
  function safeDateText(d){ try { return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d)); } catch(_) { return 'first kickoff of Round 2'; } }

  async function api(path, opts={}){
    const r = await fetch('/.netlify/functions/' + path, opts);
    let j = {};
    try { j = await r.json(); } catch(_) {}
    if(!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  }

  async function loadDeadline(){
    try{
      const state = await api('get-state');
      const games = (state.matches || []).filter(m => String(m.round || '').toLowerCase().includes('round 2')).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));
      deadline = games[0] && games[0].kickoff ? new Date(games[0].kickoff) : null;
      if(deadline && isNaN(deadline.getTime())) deadline = null;
    }catch(_){ deadline = null; }
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
    if(syncing || !isLocked() || isClosed() || !nickname()) return;
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

  function clearActiveTabs() {
    document.querySelectorAll('#roundTabs button').forEach(b => b.classList.remove('active'));
    const b = document.querySelector('[data-bonus-tab="bonus"]');
    if (b) b.classList.add('active');
  }

  function renderCategory(cat, picks, locked) {
    const val = picks[cat.key] || '';
    return '<div class="bonus-card">' +
      '<h3>'+cat.title+' — '+cat.points+' pts</h3>' +
      '<p class="bonus-note">Choose one favourite, or pick the field option to cover everyone not listed.</p>' +
      '<div class="bonus-grid">' +
      cat.options.map(opt => '<button type="button" class="bonus-option '+(val===opt.name?'active':'')+'" '+(locked?'disabled':'')+' data-bonus-pick="'+cat.key+'" data-value="'+opt.name+'"><span class="bonus-option-main">'+pickLabel(opt)+'</span><span class="bonus-rank">'+opt.chance+'</span></button>').join('') +
      '</div></div>';
  }

  function renderBonus() {
    try{
      clearActiveTabs();
      const matches = document.querySelector('#matches');
      const submitBtn = document.querySelector('#submitBtn');
      if (submitBtn) submitBtn.style.display = 'none';
      if (!matches) return;
      const picks = readPicks();
      const locked = isLocked() || isClosed();
      if(isLocked()) syncLockedPicks();
      const deadlineText = deadline ? 'Deadline: '+safeDateText(deadline)+' Kuwait time.' : 'Deadline: first kickoff of Round 2.';
      const closedText = isClosed() ? '<p class="bonus-status"><span class="bad">Bonus predictions are closed.</span></p>' : '';
      matches.innerHTML = '<div class="bonus-card"><h2>Bonus Predictions</h2><p class="bonus-note">One-time tournament picks. '+deadlineText+'</p>'+closedText+'</div>' +
        CATEGORIES.map(c => renderCategory(c, picks, locked)).join('') +
        '<div class="bonus-card"><div class="bonus-actions"><button id="lockBonusBtn" '+(locked?'disabled':'')+'>'+(isLocked()?'Bonus predictions locked':(isClosed()?'Predictions closed':'Lock bonus predictions'))+'</button><button id="clearBonusBtn" class="secondary" '+(locked?'disabled':'')+'>Clear bonus picks</button></div><p class="bonus-status" id="bonusStatus">'+(isLocked()?'<span class="ok">Your bonus predictions are locked and visible on the leaderboard.</span>':(isClosed()?'<span class="bad">The Round 2 deadline has passed.</span>':'Pick all 4 categories, then lock them in.'))+'</p></div>';
      if (locked) return;
      document.querySelectorAll('[data-bonus-pick]').forEach(btn => btn.onclick = () => { const p = readPicks(); p[btn.dataset.bonusPick] = btn.dataset.value; writePicks(p); renderBonus(); });
      const lock = document.querySelector('#lockBonusBtn');
      if (lock) lock.onclick = async () => {
        try{
          if(isClosed()) throw new Error('Bonus predictions are closed. The deadline was the first kickoff of Round 2.');
          const p = readPicks();
          const missing = CATEGORIES.find(c => !p[c.key] || !String(p[c.key]).trim());
          if (missing) { document.querySelector('#bonusStatus').innerHTML = '<span class="bad">Choose a pick for '+missing.title+'.</span>'; return; }
          if(!nickname()) throw new Error('Enter your name first.');
          lock.disabled = true;
          document.querySelector('#bonusStatus').textContent = 'Saving bonus predictions...';
          await savePicks(p);
          localStorage.setItem(lockKey(), '1');
          renderBonus();
        }catch(e){ lock.disabled = false; document.querySelector('#bonusStatus').innerHTML = '<span class="bad">'+e.message+'</span>'; }
      };
      const clear = document.querySelector('#clearBonusBtn');
      if (clear) clear.onclick = () => { localStorage.removeItem(storeKey()); localStorage.removeItem(lockKey()); renderBonus(); };
    }catch(e){
      const matches = document.querySelector('#matches');
      if(matches) matches.innerHTML = '<div class="bonus-card"><h2>Bonus Predictions</h2><p class="bonus-status"><span class="bad">'+e.message+'</span></p></div>';
    }
  }

  async function start() {
    await loadDeadline();
    await loadRemoteBonus();
    ensureTab();
    const tabs = document.querySelector('#roundTabs');
    if (tabs) new MutationObserver(ensureTab).observe(tabs, { childList:true });
    setInterval(()=>{ const b=document.querySelector('[data-bonus-tab="bonus"]'); if(b && b.classList.contains('active')) renderBonus(); }, 30000);
  }
  window.addEventListener('load', start);
})();
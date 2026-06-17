(() => {
  const CATEGORIES = [
    { key:'winner', title:'World Cup Winner', points:15, fieldLabel:'🌍 Any Other Team', options:[
      {name:'France',label:'🇫🇷 France',chance:'18%'},{name:'England',label:'🏴 England',chance:'16%'},{name:'Spain',label:'🇪🇸 Spain',chance:'14%'},{name:'Argentina',label:'🇦🇷 Argentina',chance:'13%'},{name:'Brazil',label:'🇧🇷 Brazil',chance:'11%'},{name:'Any Other Team',label:'🌍 Any Other Team',chance:'28%',field:true}
    ]},
    { key:'potm', title:'Player of the Tournament', points:10, fieldLabel:'👤 Any Other Player', options:[
      {name:'Kylian Mbappe',label:'🇫🇷 Mbappé',chance:'18%'},{name:'Lamine Yamal',label:'🇪🇸 Yamal',chance:'15%'},{name:'Harry Kane',label:'🏴 Kane',chance:'13%'},{name:'Lionel Messi',label:'🇦🇷 Messi',chance:'12%'},{name:'Michael Olise',label:'🇫🇷 Olise',chance:'8%'},{name:'Any Other Player',label:'👤 Any Other Player',chance:'34%',field:true}
    ]},
    { key:'golden_boot', title:'Golden Boot', points:10, fieldLabel:'👤 Any Other Player', options:[
      {name:'Kylian Mbappe',label:'🇫🇷 Mbappé',chance:'20%'},{name:'Harry Kane',label:'🏴 Kane',chance:'15%'},{name:'Erling Haaland',label:'🇳🇴 Haaland',chance:'12%'},{name:'Lionel Messi',label:'🇦🇷 Messi',chance:'10%'},{name:'Kai Havertz',label:'🇩🇪 Havertz',chance:'8%'},{name:'Any Other Player',label:'👤 Any Other Player',chance:'35%',field:true}
    ]},
    { key:'golden_glove', title:'Golden Glove', points:8, fieldLabel:'🧤 Any Other Goalkeeper', options:[
      {name:'Mike Maignan',label:'🇫🇷 Maignan',chance:'16%'},{name:'Emiliano Martinez',label:'🇦🇷 Martínez',chance:'15%'},{name:'Jordan Pickford',label:'🏴 Pickford',chance:'13%'},{name:'Unai Simon',label:'🇪🇸 Unai Simón',chance:'12%'},{name:'Alisson Becker',label:'🇧🇷 Alisson',chance:'10%'},{name:'Any Other Goalkeeper',label:'🧤 Any Other Goalkeeper',chance:'34%',field:true}
    ]}
  ];

  let deadline = null;
  const storeKey = () => 'kaifanwc_bonus_' + (localStorage.getItem('kaifanwc_name') || 'guest');
  const lockKey = () => storeKey() + '_locked';
  const readPicks = () => { try { return JSON.parse(localStorage.getItem(storeKey()) || '{}'); } catch (_) { return {}; } };
  const writePicks = p => localStorage.setItem(storeKey(), JSON.stringify(p));
  const isLocked = () => localStorage.getItem(lockKey()) === '1';
  const nickname = () => String(localStorage.getItem('kaifanwc_name') || '').trim().toLowerCase();
  const optionNames = cat => cat.options.map(o => o.name);
  const fmtFull = d => new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',dateStyle:'medium',timeStyle:'short'}).format(new Date(d));
  const isClosed = () => deadline && Date.now() >= deadline.getTime();

  async function api(path, opts={}){
    const r = await fetch('/.netlify/functions/' + path, opts);
    const j = await r.json();
    if(!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  }

  async function loadDeadline(){
    try{
      const state = await api('get-state');
      const games = (state.matches || []).filter(m => String(m.round || '').toLowerCase().includes('round 2')).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));
      deadline = games[0] ? new Date(games[0].kickoff) : null;
    }catch(_){ deadline = null; }
  }

  function ensureTab() {
    const tabs = document.querySelector('#roundTabs');
    if (!tabs || tabs.querySelector('[data-bonus-tab="bonus"]')) return;
    const leader = tabs.querySelector('[data-tab="leaderboard"]');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Predictions';
    btn.dataset.bonusTab = 'bonus';
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
    return '<div class="bonus-card" data-bonus-cat="'+cat.key+'">' +
      '<h3>'+cat.title+' — '+cat.points+' pts</h3>' +
      '<p class="bonus-note">Choose one favourite, or pick the field option to cover everyone not listed.</p>' +
      '<div class="bonus-grid">' +
      cat.options.map(opt => '<button type="button" class="bonus-option '+(val===opt.name?'active':'')+'" '+(locked?'disabled':'')+' data-bonus-pick="'+cat.key+'" data-value="'+opt.name+'"><span>'+opt.label+'</span><span class="bonus-rank">'+opt.chance+'</span></button>').join('') +
      '</div>' +
      '</div>';
  }

  function renderBonus() {
    clearActiveTabs();
    const matches = document.querySelector('#matches');
    const submitBtn = document.querySelector('#submitBtn');
    if (submitBtn) submitBtn.style.display = 'none';
    if (!matches) return;

    const picks = readPicks();
    const locked = isLocked() || isClosed();
    const deadlineText = deadline ? 'Deadline: '+fmtFull(deadline)+' Kuwait time.' : 'Deadline: first kickoff of Round 2.';
    const closedText = isClosed() ? '<p class="bonus-status"><span class="bad">Bonus predictions are closed.</span></p>' : '';
    matches.innerHTML = '<div class="bonus-card"><h2>Bonus Predictions</h2><p class="bonus-note">One-time tournament picks. They close when the first game of Round 2 kicks off. '+deadlineText+'</p>'+closedText+'</div>' +
      CATEGORIES.map(c => renderCategory(c, picks, locked)).join('') +
      '<div class="bonus-card"><div class="bonus-actions"><button id="lockBonusBtn" '+(locked?'disabled':'')+'>'+(isLocked()?'Bonus predictions locked':(isClosed()?'Predictions closed':'Lock bonus predictions'))+'</button><button id="clearBonusBtn" class="secondary" '+(locked?'disabled':'')+'>Clear bonus picks</button></div><p class="bonus-status" id="bonusStatus">'+(isLocked()?'<span class="ok">Your bonus predictions are locked.</span>':(isClosed()?'<span class="bad">The Round 2 deadline has passed.</span>':'Pick all 4 categories, then lock them in.'))+'</p></div>';

    if (locked) return;

    document.querySelectorAll('[data-bonus-pick]').forEach(btn => btn.onclick = () => {
      const p = readPicks();
      p[btn.dataset.bonusPick] = btn.dataset.value;
      writePicks(p);
      renderBonus();
    });

    const lock = document.querySelector('#lockBonusBtn');
    if (lock) lock.onclick = async () => {
      try{
        if(isClosed()) throw new Error('Bonus predictions are closed. The deadline was the first kickoff of Round 2.');
        const p = readPicks();
        const missing = CATEGORIES.find(c => !p[c.key] || !String(p[c.key]).trim());
        if (missing) {
          document.querySelector('#bonusStatus').innerHTML = '<span class="bad">Choose a pick for '+missing.title+'.</span>';
          return;
        }
        if(!nickname()) throw new Error('Enter your name first.');
        lock.disabled = true;
        document.querySelector('#bonusStatus').textContent = 'Saving bonus predictions...';
        await api('submit-bonus-predictions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:nickname(),picks:p})});
        localStorage.setItem(lockKey(), '1');
        renderBonus();
      }catch(e){
        lock.disabled = false;
        document.querySelector('#bonusStatus').innerHTML = '<span class="bad">'+e.message+'</span>';
      }
    };

    const clear = document.querySelector('#clearBonusBtn');
    if (clear) clear.onclick = () => { localStorage.removeItem(storeKey()); renderBonus(); };
  }

  async function start() {
    await loadDeadline();
    ensureTab();
    const tabs = document.querySelector('#roundTabs');
    if (tabs) new MutationObserver(ensureTab).observe(tabs, { childList:true });
    setInterval(()=>{ if(document.querySelector('[data-bonus-tab="bonus"].active')) renderBonus(); }, 30000);
  }

  window.addEventListener('load', start);
})();
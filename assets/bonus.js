(() => {
  const CATEGORIES = [
    { key:'winner', title:'World Cup Winner', points:15, otherLabel:'Other team', options:[
      {name:'France',chance:'16%'},{name:'England',chance:'14%'},{name:'Argentina',chance:'13%'},{name:'Spain',chance:'12%'},{name:'Brazil',chance:'11%'},{name:'Portugal',chance:'9%'},{name:'Germany',chance:'7%'},{name:'Netherlands',chance:'5%'},{name:'Uruguay',chance:'4%'},{name:'Belgium',chance:'3%'}
    ]},
    { key:'potm', title:'Player of the Tournament', points:10, otherLabel:'Other player', options:[
      {name:'Kylian Mbappe',chance:'18%'},{name:'Jude Bellingham',chance:'12%'},{name:'Lamine Yamal',chance:'10%'},{name:'Vinicius Junior',chance:'9%'},{name:'Harry Kane',chance:'7%'},{name:'Rodri',chance:'7%'},{name:'Lionel Messi',chance:'6%'},{name:'Jamal Musiala',chance:'5%'},{name:'Florian Wirtz',chance:'4%'},{name:'Bukayo Saka',chance:'4%'},{name:'Phil Foden',chance:'3%'},{name:'Federico Valverde',chance:'3%'},{name:'Pedri',chance:'3%'},{name:'Julian Alvarez',chance:'2%'},{name:'Achraf Hakimi',chance:'2%'}
    ]},
    { key:'golden_boot', title:'Golden Boot', points:10, otherLabel:'Other player', options:[
      {name:'Kylian Mbappe',chance:'20%'},{name:'Harry Kane',chance:'13%'},{name:'Erling Haaland',chance:'12%'},{name:'Lionel Messi',chance:'8%'},{name:'Cristiano Ronaldo',chance:'7%'},{name:'Julian Alvarez',chance:'7%'},{name:'Vinicius Junior',chance:'6%'},{name:'Lautaro Martinez',chance:'5%'},{name:'Memphis Depay',chance:'4%'},{name:'Alvaro Morata',chance:'4%'}
    ]},
    { key:'golden_glove', title:'Golden Glove', points:8, otherLabel:'Other goalkeeper', options:[
      {name:'Mike Maignan',chance:'15%'},{name:'Jordan Pickford',chance:'13%'},{name:'Emiliano Martinez',chance:'12%'},{name:'Unai Simon',chance:'11%'},{name:'Alisson',chance:'10%'},{name:'Diogo Costa',chance:'8%'},{name:'Manuel Neuer',chance:'7%'},{name:'Gregor Kobel',chance:'6%'},{name:'Thibaut Courtois',chance:'5%'},{name:'Andries Noppert',chance:'4%'}
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
    const names = optionNames(cat);
    const isOther = val && !names.includes(val);
    return '<div class="bonus-card" data-bonus-cat="'+cat.key+'">' +
      '<h3>'+cat.title+' — '+cat.points+' pts</h3>' +
      '<p class="bonus-note">Favourites are sorted from most likely to least likely. Choose one, or use Other and type your own pick.</p>' +
      '<div class="bonus-grid">' +
      cat.options.map(opt => '<button type="button" class="bonus-option '+(val===opt.name?'active':'')+'" '+(locked?'disabled':'')+' data-bonus-pick="'+cat.key+'" data-value="'+opt.name+'"><span>'+opt.name+'</span><span class="bonus-rank">'+opt.chance+'</span></button>').join('') +
      '<button type="button" class="bonus-option '+(isOther?'active':'')+'" '+(locked?'disabled':'')+' data-bonus-other="'+cat.key+'"><span>Other</span><span class="bonus-rank">manual</span></button>' +
      '</div>' +
      '<div class="bonus-other-wrap '+(isOther?'show':'')+'" data-other-wrap="'+cat.key+'"><input '+(locked?'disabled':'')+' data-other-input="'+cat.key+'" placeholder="'+cat.otherLabel+'" value="'+(isOther?val.replace(/"/g,'&quot;'):'')+'"></div>' +
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

    document.querySelectorAll('[data-bonus-other]').forEach(btn => btn.onclick = () => {
      const key = btn.dataset.bonusOther;
      const wrap = document.querySelector('[data-other-wrap="'+key+'"]');
      const input = document.querySelector('[data-other-input="'+key+'"]');
      if (wrap) wrap.classList.add('show');
      if (input) { input.focus(); input.oninput(); }
    });

    document.querySelectorAll('[data-other-input]').forEach(input => input.oninput = () => {
      const p = readPicks();
      p[input.dataset.otherInput] = input.value.trim();
      writePicks(p);
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
(() => {
  const CATEGORIES = [
    { key:'winner', title:'World Cup Winner', points:15, otherLabel:'Other team', options:['France','England','Argentina','Spain','Brazil','Portugal','Germany','Netherlands','Uruguay','Belgium'] },
    { key:'potm', title:'Player of the Tournament', points:10, otherLabel:'Other player', options:['Kylian Mbappe','Jude Bellingham','Lamine Yamal','Vinicius Junior','Harry Kane','Rodri','Lionel Messi','Jamal Musiala','Florian Wirtz','Bukayo Saka','Phil Foden','Federico Valverde','Pedri','Julian Alvarez','Achraf Hakimi'] },
    { key:'golden_boot', title:'Golden Boot', points:10, otherLabel:'Other player', options:['Kylian Mbappe','Harry Kane','Erling Haaland','Lionel Messi','Cristiano Ronaldo','Julian Alvarez','Vinicius Junior','Lautaro Martinez','Memphis Depay','Alvaro Morata'] },
    { key:'golden_glove', title:'Golden Glove', points:8, otherLabel:'Other goalkeeper', options:['Mike Maignan','Jordan Pickford','Emiliano Martinez','Unai Simon','Alisson','Diogo Costa','Manuel Neuer','Gregor Kobel','Thibaut Courtois','Andries Noppert'] }
  ];

  const storeKey = () => 'kaifanwc_bonus_' + (localStorage.getItem('kaifanwc_name') || 'guest');
  const lockKey = () => storeKey() + '_locked';
  const readPicks = () => {
    try { return JSON.parse(localStorage.getItem(storeKey()) || '{}'); } catch (_) { return {}; }
  };
  const writePicks = p => localStorage.setItem(storeKey(), JSON.stringify(p));
  const isLocked = () => localStorage.getItem(lockKey()) === '1';

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
    const isOther = val && !cat.options.includes(val);
    return '<div class="bonus-card" data-bonus-cat="'+cat.key+'">' +
      '<h3>'+cat.title+' — '+cat.points+' pts</h3>' +
      '<p class="bonus-note">Top favourites in order. Choose one, or use Other and type your own pick.</p>' +
      '<div class="bonus-grid">' +
      cat.options.map((name, i) => '<button type="button" class="bonus-option '+(val===name?'active':'')+'" data-bonus-pick="'+cat.key+'" data-value="'+name+'"><span>'+name+'</span><span class="bonus-rank">#'+(i+1)+'</span></button>').join('') +
      '<button type="button" class="bonus-option '+(isOther?'active':'')+'" data-bonus-other="'+cat.key+'"><span>Other</span><span class="bonus-rank">manual</span></button>' +
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
    const locked = isLocked();
    matches.innerHTML = '<div class="bonus-card"><h2>Bonus Predictions</h2><p class="bonus-note">These are extra ways to win points. Once you lock them in, they are final.</p></div>' +
      CATEGORIES.map(c => renderCategory(c, picks, locked)).join('') +
      '<div class="bonus-card"><div class="bonus-actions"><button id="lockBonusBtn" '+(locked?'disabled':'')+'>'+(locked?'Bonus predictions locked':'Lock bonus predictions')+'</button><button id="clearBonusBtn" class="secondary" '+(locked?'disabled':'')+'>Clear bonus picks</button></div><p class="bonus-status" id="bonusStatus">'+(locked?'<span class="ok">Your bonus predictions are locked.</span>':'Pick all 4 categories, then lock them in.')+'</p></div>';

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
    if (lock) lock.onclick = () => {
      const p = readPicks();
      const missing = CATEGORIES.find(c => !p[c.key] || !String(p[c.key]).trim());
      if (missing) {
        document.querySelector('#bonusStatus').innerHTML = '<span class="bad">Choose a pick for '+missing.title+'.</span>';
        return;
      }
      localStorage.setItem(lockKey(), '1');
      renderBonus();
    };

    const clear = document.querySelector('#clearBonusBtn');
    if (clear) clear.onclick = () => { localStorage.removeItem(storeKey()); renderBonus(); };
  }

  function start() {
    ensureTab();
    const tabs = document.querySelector('#roundTabs');
    if (tabs) new MutationObserver(ensureTab).observe(tabs, { childList:true });
  }

  window.addEventListener('load', start);
})();
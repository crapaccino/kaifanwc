(() => {
  const nickname = () => String(localStorage.getItem('kaifanwc_name') || '').trim().toLowerCase();
  const displayName = value => String(value || '').replace(/\b\w/g, c => c.toUpperCase());
  const fmtTime = d => new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d));
  const fmtDay = d => new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',weekday:'short',day:'numeric',month:'short'}).format(new Date(d)).toUpperCase();
  const isRoundTwo = r => String(r || '').toLowerCase().includes('round 2');

  async function fetchJson(path){
    const r = await fetch('/.netlify/functions/' + path + (path.includes('?') ? '&' : '?') + 'ts=' + Date.now());
    const j = await r.json();
    if(!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  }

  function labelForPrediction(p, m){
    if(!p) return '-';
    if(p.predicted_winner === 'home') return m.home;
    if(p.predicted_winner === 'away') return m.away;
    return 'Draw';
  }

  async function hasLockedRoundTwo(){
    const name = nickname();
    if(!name) return false;
    const [state, player] = await Promise.all([
      fetchJson('get-state'),
      fetchJson('get-player?nickname=' + encodeURIComponent(name))
    ]);
    const r2 = (state.matches || []).filter(m => isRoundTwo(m.round));
    const ids = new Set(r2.map(m => String(m.id)));
    return (player.predictions || []).some(p => ids.has(String(p.match_id)));
  }

  async function renderReview(){
    const name = nickname();
    const matchesEl = document.querySelector('#matches');
    const submit = document.querySelector('#submitBtn');
    if(submit) submit.style.display = 'none';
    document.querySelectorAll('#roundTabs button').forEach(b => b.classList.remove('active'));
    const tab = document.querySelector('[data-review-round="2"]');
    if(tab) tab.classList.add('active');
    if(!matchesEl) return;
    matchesEl.innerHTML = '<div class="notice">Loading your locked Round 2 picks...</div>';

    try{
      const [state, player] = await Promise.all([
        fetchJson('get-state'),
        fetchJson('get-player?nickname=' + encodeURIComponent(name))
      ]);
      const picks = {};
      (player.predictions || []).forEach(p => picks[String(p.match_id)] = p);
      const games = (state.matches || []).filter(m => isRoundTwo(m.round)).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));
      const grouped = {};
      games.forEach(m => { const day = fmtDay(m.kickoff); if(!grouped[day]) grouped[day] = []; grouped[day].push(m); });
      const body = Object.entries(grouped).map(([day,ms]) => '<div class="day-header">'+day+'</div>' + ms.map(m => {
        const p = picks[String(m.id)];
        const score = p ? (p.home_score + ' - ' + p.away_score) : '-';
        const pick = labelForPrediction(p, m);
        return '<div class="match"><div class="match-top"><div class="team home"><span class="team-name">'+m.home+'</span></div><div class="result-score muted-score">'+fmtTime(m.kickoff)+'</div><div class="team away"><span class="team-name">'+m.away+'</span></div></div><div class="match-info"><div class="meta-row"><span>Locked pick</span><span>'+fmtTime(m.kickoff)+' Kuwait</span></div></div><div class="notice"><b>'+displayName(name)+' picked: '+pick+'</b><br><span class="small">Predicted score: '+score+'</span></div></div>';
      }).join('')).join('');
      matchesEl.innerHTML = '<div class="round-lock"><b>Round 2 locked 🔒</b><br><span class="small">You can review your predictions, but you cannot change them.</span></div>' + (body || '<div class="notice">No Round 2 picks found.</div>');
    }catch(e){
      matchesEl.innerHTML = '<div class="notice"><span class="bad">'+e.message+'</span></div>';
    }
  }

  async function inject(){
    const tabs = document.querySelector('#roundTabs');
    if(!tabs || tabs.querySelector('[data-review-round="2"]')) return;
    try{
      if(!(await hasLockedRoundTwo())) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Round 2 🔒';
      btn.dataset.reviewRound = '2';
      btn.onclick = renderReview;
      const leaderboard = tabs.querySelector('[data-tab="leaderboard"]');
      if(leaderboard) tabs.insertBefore(btn, leaderboard); else tabs.appendChild(btn);
    }catch(_){ }
  }

  window.addEventListener('load', () => {
    setInterval(inject, 1500);
    inject();
  });
})();
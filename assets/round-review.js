(() => {
  const nickname = () => String(localStorage.getItem('kaifanwc_name') || '').trim().toLowerCase();
  const displayName = value => String(value || '').replace(/\b\w/g, c => c.toUpperCase());
  const fmtTime = d => new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d));
  const fmtDay = d => new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',weekday:'short',day:'numeric',month:'short'}).format(new Date(d)).toUpperCase();
  const displayRoundName = r => String(r || '').replace('Group Stage - ','').replace('Group Stage ','');

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

  function predictionPoints(p, m){
    if(!p || m.home_score == null || m.away_score == null) return null;
    const actual = m.home_score > m.away_score ? 'home' : (m.away_score > m.home_score ? 'away' : 'draw');
    if(Number(p.home_score) === Number(m.home_score) && Number(p.away_score) === Number(m.away_score)) return 5;
    if(p.predicted_winner === actual) return 2;
    return 0;
  }

  async function lockedRounds(){
    const name = nickname();
    if(!name) return [];
    const [state, player] = await Promise.all([
      fetchJson('get-state'),
      fetchJson('get-player?nickname=' + encodeURIComponent(name))
    ]);
    const picks = player.predictions || [];
    const pickedIds = new Set(picks.map(p => String(p.match_id)));
    const rounds = [...new Set((state.matches || []).map(m => m.round))].sort((a,b)=>{
      const aa = (state.matches || []).filter(m => m.round === a).sort((x,y)=>new Date(x.kickoff)-new Date(y.kickoff))[0];
      const bb = (state.matches || []).filter(m => m.round === b).sort((x,y)=>new Date(x.kickoff)-new Date(y.kickoff))[0];
      return new Date(aa?.kickoff || 0) - new Date(bb?.kickoff || 0);
    });
    return rounds.filter(round => (state.matches || []).some(m => m.round === round && pickedIds.has(String(m.id))));
  }

  async function renderReview(round){
    const name = nickname();
    const matchesEl = document.querySelector('#matches');
    const submit = document.querySelector('#submitBtn');
    if(submit) submit.style.display = 'none';
    document.querySelectorAll('#roundTabs button').forEach(b => b.classList.remove('active'));
    const tab = document.querySelector('[data-review-round="'+round+'"]');
    if(tab) tab.classList.add('active');
    if(!matchesEl) return;
    matchesEl.innerHTML = '<div class="notice">Loading your locked '+displayRoundName(round)+' picks...</div>';

    try{
      const [state, player] = await Promise.all([
        fetchJson('get-state'),
        fetchJson('get-player?nickname=' + encodeURIComponent(name))
      ]);
      const picks = {};
      (player.predictions || []).forEach(p => picks[String(p.match_id)] = p);
      const games = (state.matches || []).filter(m => m.round === round).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));
      const finished = games.filter(m => m.home_score != null && m.away_score != null);
      const earned = finished.reduce((sum,m) => sum + (predictionPoints(picks[String(m.id)], m) || 0), 0);
      const correct = finished.filter(m => (predictionPoints(picks[String(m.id)], m) || 0) > 0).length;
      const summary = finished.length ? '<div class="round-lock"><b>'+displayRoundName(round)+' locked 🔒</b><br><span class="small">'+correct+'/'+finished.length+' results correct • '+earned+' points earned so far.</span></div>' : '<div class="round-lock"><b>'+displayRoundName(round)+' locked 🔒</b><br><span class="small">You can review your predictions, but you cannot change them.</span></div>';
      const grouped = {};
      games.forEach(m => { const day = fmtDay(m.kickoff); if(!grouped[day]) grouped[day] = []; grouped[day].push(m); });
      const body = Object.entries(grouped).map(([day,ms]) => '<div class="day-header">'+day+'</div>' + ms.map(m => {
        const p = picks[String(m.id)];
        const score = p ? (p.home_score + ' - ' + p.away_score) : '-';
        const pick = labelForPrediction(p, m);
        const actual = m.home_score == null || m.away_score == null ? 'Not played yet' : ('Actual: '+m.home_score+' - '+m.away_score);
        const pts = predictionPoints(p, m);
        const ptsText = pts == null ? '' : '<br><span class="small">Points: <b>'+pts+'</b></span>';
        return '<div class="match"><div class="match-top"><div class="team home"><span class="team-name">'+m.home+'</span></div><div class="result-score muted-score">'+fmtTime(m.kickoff)+'</div><div class="team away"><span class="team-name">'+m.away+'</span></div></div><div class="match-info"><div class="meta-row"><span>Locked pick</span><span>'+fmtTime(m.kickoff)+' Kuwait</span></div></div><div class="notice"><b>'+displayName(name)+' picked: '+pick+'</b><br><span class="small">Predicted score: '+score+' • '+actual+'</span>'+ptsText+'</div></div>';
      }).join('')).join('');
      matchesEl.innerHTML = summary + (body || '<div class="notice">No picks found.</div>');
    }catch(e){
      matchesEl.innerHTML = '<div class="notice"><span class="bad">'+e.message+'</span></div>';
    }
  }

  async function inject(){
    const tabs = document.querySelector('#roundTabs');
    if(!tabs) return;
    try{
      const rounds = await lockedRounds();
      rounds.forEach(round => {
        if(tabs.querySelector('[data-review-round="'+round+'"]')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = displayRoundName(round) + ' 🔒';
        btn.dataset.reviewRound = round;
        btn.onclick = () => renderReview(round);
        const leaderboard = tabs.querySelector('[data-tab="leaderboard"]');
        if(leaderboard) tabs.insertBefore(btn, leaderboard); else tabs.appendChild(btn);
      });
    }catch(_){ }
  }

  window.addEventListener('load', () => {
    setInterval(inject, 1500);
    inject();
  });
})();
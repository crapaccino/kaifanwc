let state={matches:[],leaderboard:[],live:null};
let picks={};
let activeTab=null;
let pastRoundsOpen=false;
let savedMatchIds=new Set();
let currentNickname=localStorage.getItem('kaifanwc_name')||'';
let nameLocked=localStorage.getItem('kaifanwc_name_locked')==='1';

const $=s=>document.querySelector(s);

const FLAG_CODES={
  "Mexico":"mx","South Africa":"za","South Korea":"kr","Korea Republic":"kr","Czechia":"cz",
  "Canada":"ca","Bosnia and Herzegovina":"ba","Qatar":"qa","Switzerland":"ch",
  "Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct",
  "United States":"us","Paraguay":"py","Australia":"au","Turkey":"tr",
  "Germany":"de","Curacao":"cw","Ivory Coast":"ci","Ecuador":"ec",
  "Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn",
  "Belgium":"be","Egypt":"eg","Iran":"ir","New Zealand":"nz",
  "Spain":"es","Cape Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy",
  "France":"fr","Senegal":"sn","Iraq":"iq","Norway":"no",
  "Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo",
  "Portugal":"pt","DR Congo":"cd","Uzbekistan":"uz","Colombia":"co",
  "England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa"
};

const SHORT_NAMES={
  "Bosnia and Herzegovina":"Bosnia",
  "Korea Republic":"South Korea",
  "United States":"USA",
  "South Africa":"South Africa",
  "Saudi Arabia":"Saudi Arabia",
  "New Zealand":"New Zealand",
  "DR Congo":"DR Congo",
  "Ivory Coast":"Ivory Coast",
  "Cape Verde":"Cape Verde"
};

const VENUES={
  "Mexico|South Africa":"Estadio Azteca, Mexico City",
  "Czechia|South Korea":"Estadio Akron, Guadalajara",
  "Bosnia and Herzegovina|Canada":"BMO Field, Toronto",
  "Paraguay|United States":"SoFi Stadium, Los Angeles",
  "Haiti|Scotland":"Gillette Stadium, Boston",
  "Australia|Turkey":"BC Place, Vancouver",
  "Brazil|Morocco":"MetLife Stadium, New York/New Jersey",
  "Qatar|Switzerland":"Levi’s Stadium, San Francisco Bay Area",
  "Ecuador|Ivory Coast":"Lincoln Financial Field, Philadelphia",
  "Curacao|Germany":"NRG Stadium, Houston",
  "Japan|Netherlands":"AT&T Stadium, Dallas",
  "Sweden|Tunisia":"Estadio BBVA, Monterrey",
  "Saudi Arabia|Uruguay":"Hard Rock Stadium, Miami",
  "Cape Verde|Spain":"Mercedes-Benz Stadium, Atlanta",
  "Iran|New Zealand":"SoFi Stadium, Los Angeles",
  "Belgium|Egypt":"Lumen Field, Seattle",
  "France|Senegal":"MetLife Stadium, New York/New Jersey",
  "Iraq|Norway":"Gillette Stadium, Boston",
  "Algeria|Argentina":"Arrowhead Stadium, Kansas City",
  "Austria|Jordan":"Levi’s Stadium, San Francisco Bay Area",
  "DR Congo|Portugal":"NRG Stadium, Houston",
  "Croatia|England":"AT&T Stadium, Dallas",
  "Ghana|Panama":"BMO Field, Toronto",
  "Colombia|Uzbekistan":"Estadio Azteca, Mexico City",
  "Czechia|South Africa":"Mercedes-Benz Stadium, Atlanta",
  "Bosnia and Herzegovina|Switzerland":"SoFi Stadium, Los Angeles",
  "Canada|Qatar":"BC Place, Vancouver",
  "Mexico|South Korea":"Estadio Akron, Guadalajara",
  "Australia|United States":"Lumen Field, Seattle",
  "Morocco|Scotland":"Gillette Stadium, Boston",
  "Brazil|Haiti":"Lincoln Financial Field, Philadelphia",
  "Paraguay|Turkey":"Levi’s Stadium, San Francisco Bay Area",
  "Netherlands|Sweden":"NRG Stadium, Houston",
  "Germany|Ivory Coast":"BMO Field, Toronto",
  "Curacao|Ecuador":"Arrowhead Stadium, Kansas City",
  "Japan|Tunisia":"Estadio BBVA, Monterrey",
  "Saudi Arabia|Spain":"Mercedes-Benz Stadium, Atlanta",
  "Belgium|Iran":"SoFi Stadium, Los Angeles",
  "Cape Verde|Uruguay":"Hard Rock Stadium, Miami",
  "Egypt|New Zealand":"BC Place, Vancouver",
  "Argentina|Austria":"AT&T Stadium, Dallas",
  "France|Iraq":"Lincoln Financial Field, Philadelphia",
  "Norway|Senegal":"MetLife Stadium, New York/New Jersey",
  "Algeria|Jordan":"Levi’s Stadium, San Francisco Bay Area",
  "Portugal|Uzbekistan":"NRG Stadium, Houston",
  "England|Ghana":"Gillette Stadium, Boston",
  "Croatia|Panama":"BMO Field, Toronto",
  "Colombia|DR Congo":"Estadio Akron, Guadalajara",
  "Canada|Switzerland":"BC Place, Vancouver",
  "Bosnia and Herzegovina|Qatar":"Lumen Field, Seattle",
  "Brazil|Scotland":"Hard Rock Stadium, Miami",
  "Haiti|Morocco":"Mercedes-Benz Stadium, Atlanta",
  "Czechia|Mexico":"Estadio Azteca, Mexico City",
  "South Africa|South Korea":"Estadio BBVA, Monterrey",
  "Ecuador|Germany":"MetLife Stadium, New York/New Jersey",
  "Curacao|Ivory Coast":"Lincoln Financial Field, Philadelphia",
  "Japan|Sweden":"AT&T Stadium, Dallas",
  "Netherlands|Tunisia":"Arrowhead Stadium, Kansas City",
  "Turkey|United States":"SoFi Stadium, Los Angeles",
  "Australia|Paraguay":"Levi’s Stadium, San Francisco Bay Area",
  "France|Norway":"Gillette Stadium, Boston",
  "Iraq|Senegal":"Lincoln Financial Field, Philadelphia",
  "Spain|Uruguay":"Hard Rock Stadium, Miami",
  "Cape Verde|Saudi Arabia":"BC Place, Vancouver",
  "Belgium|New Zealand":"BMO Field, Toronto",
  "Egypt|Iran":"Lumen Field, Seattle",
  "England|Panama":"MetLife Stadium, New York/New Jersey",
  "Croatia|Ghana":"BMO Field, Toronto",
  "Colombia|Portugal":"NRG Stadium, Houston",
  "DR Congo|Uzbekistan":"Estadio Akron, Guadalajara",
  "Argentina|Jordan":"Arrowhead Stadium, Kansas City",
  "Algeria|Austria":"Levi’s Stadium, San Francisco Bay Area"
};

function flagCode(team){return FLAG_CODES[team] || '';} 
function flagImg(team){
  const code=flagCode(team);
  if(!code) return '<span class="flag-fallback">🏳️</span>';
  return `<img class="team-flag-img" src="https://flagcdn.com/${code}.svg" alt="${team} flag" loading="lazy">`;
}
function teamName(team){return SHORT_NAMES[team] || team;}
function normalizeNickname(value){return String(value||'').trim().replace(/\s+/g,' ').toLowerCase();}
function displayName(value){return String(value||'').replace(/\b\w/g,c=>c.toUpperCase());}
function venueForMatch(m){return VENUES[[m.home,m.away].sort().join('|')] || m.venue || m.stadium || '';}

const fmtTime=d=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kuwait",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(d));
const fmtDay=d=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kuwait",weekday:"short",day:"numeric",month:"short"}).format(new Date(d)).toUpperCase();
const fmtFull=d=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kuwait",dateStyle:"medium",timeStyle:"short"}).format(new Date(d));

async function api(path, opts={}){
  const r=await fetch('/.netlify/functions/'+path, opts);
  const j=await r.json();
  if(!r.ok) throw new Error(j.error||'Request failed');
  return j;
}

function roundMatches(round){return state.matches.filter(m=>m.round===round).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));}
function roundLockTime(round){const games=roundMatches(round); return games.length?new Date(games[0].kickoff):null;}
function allRoundNames(){
  return [...new Set(state.matches.map(m=>m.round).filter(Boolean))].sort((a,b)=>{
    const aTime=roundLockTime(a)?.getTime()??Number.MAX_SAFE_INTEGER;
    const bTime=roundLockTime(b)?.getTime()??Number.MAX_SAFE_INTEGER;
    return aTime-bTime||String(a).localeCompare(String(b));
  });
}
function visibleRoundNames(){
  const rounds=allRoundNames();
  const now=Date.now();
  return rounds.filter((round,index)=>{
    const currentStart=roundLockTime(round);
    const isTimeClosed=currentStart && now>=currentStart.getTime();
    const isSubmittedClosed=hasLockedRound(round);
    if(isTimeClosed || isSubmittedClosed) return false;
    if(index===0) return true;
    const previousStart=roundLockTime(rounds[index-1]);
    return previousStart && now>=previousStart.getTime();
  });
}
function roundNames(){return visibleRoundNames();}
function pastRoundNames(){return allRoundNames().filter(round=>isRoundTimeLocked(round)||hasLockedRound(round));}
function displayRoundName(r){return String(r||"").replace("Group Stage - ","").replace("Group Stage ","");}
function matchStageLabel(m){
  const group=String(m.group_name||'');
  return group&&!/^(R(?:16|32)|QF|SF|F)$/i.test(group)?`Group ${group}`:displayRoundName(m.round);
}
function isKnockoutRound(round){return /(round of 32|round of 16|quarter|semi|final)/i.test(String(round||''));}
function isRoundTimeLocked(round){const lock=roundLockTime(round); return lock ? Date.now()>=lock.getTime() : false;}
function hasLockedRound(round){return roundMatches(round).some(m=>savedMatchIds.has(String(m.id)));}
function hasAnyLockedPicks(){return savedMatchIds.size>0;}
function hasLiveMatch(){return !!(state.live && state.live.match);}

function updateNameUi(){
  $('#playerLabel').textContent=currentNickname ? `Welcome, ${displayName(currentNickname)}${nameLocked?' 🔒':''}` : '';
  $('#changeNameBtn').style.display=(!nameLocked && currentNickname)?'inline-flex':'none';
}
function showWelcome(){
  $('#welcomeScreen').classList.remove('app-hidden');
  $('#appScreen').classList.add('app-hidden');
  $('#welcomeName').value=currentNickname||'';
}
function showApp(){
  $('#welcomeScreen').classList.add('app-hidden');
  $('#appScreen').classList.remove('app-hidden');
  updateNameUi();
  renderView(activeTab || roundNames()[0] || (hasLiveMatch()?'live':'leaderboard'));
}
async function setNameFromInput(){
  const nickname=normalizeNickname($('#welcomeName').value);
  if(!nickname){$('#welcomeStatus').textContent='Enter your name first.';return;}
  currentNickname=nickname;
  localStorage.setItem('kaifanwc_name',currentNickname);
  $('#welcomeStatus').textContent='';
  await loadSavedPicksForNickname(true);
  if(hasAnyLockedPicks()){
    nameLocked=true;
    localStorage.setItem('kaifanwc_name_locked','1');
  }
  showApp();
}

function renderTabs(active){
  activeTab=active;
  const roundButtons=roundNames().map(r=>`<button class="${r===active?'active':''}" data-tab="${r}">${displayRoundName(r)}</button>`).join('');
  const pastRounds=pastRoundNames();
  const pastButtons=pastRounds.map(r=>`<button class="${r===active?'active':''}" data-past-round="${r}">• ${displayRoundName(r)}</button>`).join('');
  const showPast=pastRoundsOpen||pastRounds.includes(active);
  const pastMenu=pastRounds.length?`<button class="past-rounds-toggle">${showPast?'📂 Past Rounds ▲':'📂 Past Rounds ▼'}</button><div class="past-rounds-menu${showPast?' open':''}">${pastButtons}</div>`:'';
  const liveButton=hasLiveMatch()?`<button class="${active==='live'?'active':''}" data-tab="live">Live 🔴</button>`:'';
  $('#roundTabs').innerHTML=roundButtons+pastMenu+liveButton+`<button class="${active==='leaderboard'?'active':''}" data-tab="leaderboard">Leaderboard</button>`;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>renderView(b.dataset.tab));
  document.querySelectorAll('[data-past-round]').forEach(b=>b.onclick=()=>renderPastRound(b.dataset.pastRound));
  const toggle=document.querySelector('.past-rounds-toggle');
  if(toggle) toggle.onclick=()=>{pastRoundsOpen=!showPast;renderTabs(active);};
}

const BONUS_SHORT={
  'France':['fr','FR'],'England':['gb-eng','ENG'],'Spain':['es','ESP'],'Argentina':['ar','ARG'],'Brazil':['br','BRA'],'Any Other Team':[null,'Other'],
  'Kylian Mbappe':['fr','KM'],'Lamine Yamal':['es','LY'],'Harry Kane':['gb-eng','HK'],'Lionel Messi':['ar','LM'],'Michael Olise':['fr','MO'],'Any Other Player':[null,'Other'],
  'Erling Haaland':['no','EH'],'Kai Havertz':['de','KH'],'Mike Maignan':['fr','MM'],'Emiliano Martinez':['ar','EM'],'Jordan Pickford':['gb-eng','JP'],
  'Unai Simon':['es','US'],'Alisson Becker':['br','AB'],'Any Other Goalkeeper':[null,'Other']
};
function compactBonusPick(value){
  const [code,label]=BONUS_SHORT[value]||[null,value||'-'];
  return code?`<span class="bonus-compact-pick"><span class="pick-label-flag"><img class="team-flag-img" src="https://flagcdn.com/${code}.svg" alt="" loading="eager"></span><span>${label}</span></span>`:label;
}
function renderTournamentPredictions(){
  const grouped={};
  (state.bonus_predictions||[]).forEach(item=>{
    if(!grouped[item.nickname]) grouped[item.nickname]={};
    grouped[item.nickname][item.category]=item.pick;
  });
  const rows=Object.keys(grouped).sort().map((name,index)=>{
    const picks=grouped[name];
    return `<tr><td>${index+1}</td><td><b>${displayName(name)}</b></td><td>${compactBonusPick(picks.winner)}</td><td>${compactBonusPick(picks.potm)}</td><td>${compactBonusPick(picks.golden_boot)}</td><td>${compactBonusPick(picks.golden_glove)}</td></tr>`;
  }).join('')||'<tr><td colspan="6">No bonus predictions locked yet.</td></tr>';
  return `<div class="bonus-card bonus-board"><h2>Tournament Predictions</h2><p class="bonus-note">Locked bonus picks. Other = any unlisted team, player, or goalkeeper.</p><table><thead><tr><th>#</th><th>Name</th><th>Winner</th><th>POTM</th><th>Boot</th><th>Glove</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function openScoringModal(){
  $('#scoringModal')?.remove();
  const modal=document.createElement('div');
  modal.id='scoringModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999';
  modal.innerHTML='<div style="background:white;max-width:520px;width:100%;border-radius:20px;padding:20px;max-height:85vh;overflow:auto"><h2>🏆 Kaifan WC Scoring</h2><h3>Match Predictions</h3><p>Exact score: <b>5 pts</b><br>Correct result: <b>3 pts</b><br>Wrong prediction: <b>0 pts</b></p><p><small>Exact score is worth 5 total points, not 5 + 3.</small></p><h3>Final Match</h3><p>Exact score: <b>10 pts</b><br>Correct winner: <b>4 pts</b></p><h3>Bonus Predictions</h3><p>World Cup Winner: <b>15 pts</b><br>Player of the Tournament: <b>10 pts</b><br>Golden Boot: <b>10 pts</b><br>Golden Glove: <b>8 pts</b></p><button id="closeScoreModal">Close</button></div>';
  document.body.appendChild(modal);
  $('#closeScoreModal').onclick=()=>modal.remove();
  modal.onclick=event=>{if(event.target===modal) modal.remove();};
}

function renderLeaderboardView(){
  renderTabs('leaderboard');
  const rounds=allRoundNames();
  const roundHeaders=rounds.map(r=>`<th>${displayRoundName(r)} Picks</th>`).join('');
  const rows=state.leaderboard.map((p,i)=>`
    <tr><td>${i+1}</td><td>${displayName(p.nickname)}</td><td><b>${p.points}</b></td>${rounds.map(r=>`<td>${p.round_predictions?.[r]??0}</td>`).join('')}<td>${p.predictions}</td></tr>
  `).join('');
  const columns=4+rounds.length;
  $('#matches').innerHTML=`<div class="leaderboard leaderboard-tab"><h2>Leaderboard <button id="scoringInfoBtn" class="secondary" style="margin-left:10px">? Scoring</button></h2><table><thead><tr><th>#</th><th>Name</th><th>Pts</th>${roundHeaders}<th>Total Picks</th></tr></thead><tbody>${rows||`<tr><td colspan="${columns}">No players yet</td></tr>`}</tbody></table>${renderTournamentPredictions()}</div>`;
  $('#scoringInfoBtn').onclick=openScoringModal;
  $('#submitBtn').style.display='none';
}

function predictionPoints(p,m){
  const winner=actualWinnerKey(m);
  if(!p||!winner) return null;
  if(Number(p.home_score)===Number(m.home_score)&&Number(p.away_score)===Number(m.away_score)) return 5;
  return p.predicted_winner===winner?3:0;
}
function predictionLabel(p,m){
  if(!p) return 'No pick';
  if(p.predicted_winner==='home') return m.home;
  if(p.predicted_winner==='away') return m.away;
  return 'Draw';
}
function renderPastRound(round){
  pastRoundsOpen=true;
  renderTabs(round);
  $('#submitBtn').style.display='none';
  const matches=roundMatches(round);
  const finished=matches.filter(m=>actualWinnerKey(m));
  const earned=finished.reduce((sum,m)=>sum+(predictionPoints(picks[m.id],m)||0),0);
  const correct=finished.filter(m=>(predictionPoints(picks[m.id],m)||0)>0).length;
  const grouped={};
  matches.forEach(m=>{const day=fmtDay(m.kickoff);if(!grouped[day]) grouped[day]=[];grouped[day].push(m);});
  const summary=`<div class="round-lock locked-notice"><b>${displayRoundName(round)} review 🔒</b><br><span class="small">${finished.length?`${correct}/${finished.length} results correct • ${earned} points earned so far.`:'This round is read-only. Results will appear here when available.'}</span></div>`;
  const body=Object.entries(grouped).map(([day,games])=>`<div class="day-header">${day}</div>${games.map(m=>{
    const p=picks[m.id];
    const predictedScore=p?`${p.home_score} - ${p.away_score}`:'No pick';
    const actual=m.home_score==null||m.away_score==null?'Not played yet':`Actual: ${m.home_score} - ${m.away_score}`;
    const points=predictionPoints(p,m);
    return `<div class="match"><div class="match-top">${teamBlock(m.home,'home')}<div class="result-score muted-score">${fmtTime(m.kickoff)}</div>${teamBlock(m.away,'away')}</div><div class="match-info"><div class="meta-row"><span>${matchStageLabel(m)}</span><span>${fmtTime(m.kickoff)} Kuwait</span></div></div><div class="notice"><b>${displayName(currentNickname||'You')} picked: ${predictionLabel(p,m)}</b><br><span class="small">Predicted score: ${predictedScore} • ${actual}</span>${points==null?'':`<br><span class="small">Points: <b>${points}</b></span>`}</div></div>`;
  }).join('')}`).join('');
  $('#matches').innerHTML=summary+(body||'<div class="notice">No matches found for this round.</div>');
}

function teamBlock(team,side){return `<div class="team ${side}"><span class="team-flag">${flagImg(team)}</span><span class="team-name">${teamName(team)}</span></div>`;}
function pickLabel(kind,team){if(kind==='draw') return 'Draw'; return `<span class="pick-label-flag">${flagImg(team)}</span><span>${teamName(team)}</span>`;}

function renderMatch(m){
  const p=picks[m.id]||{};
  const venue=venueForMatch(m);
  const result=`<div class="result-score muted-score">${fmtTime(m.kickoff)}</div>`;
  const opts=[['home',pickLabel('team',m.home)],['draw',pickLabel('draw')],['away',pickLabel('team',m.away)]].map(([v,label])=>`<button class="${p.predicted_winner===v?'active':''}" data-pick="${m.id}:${v}">${label}</button>`).join('');

  return `<div class="match">
    <div class="match-top">${teamBlock(m.home,'home')}${result}${teamBlock(m.away,'away')}</div>
    <div class="match-info"><div class="meta-row"><span>${matchStageLabel(m)}</span><span>${fmtTime(m.kickoff)} Kuwait</span></div>${venue?`<div class="venue-line">📍 ${venue}</div>`:''}</div>
    <div class="pick">${opts}</div>
    <div class="score"><input type="number" min="0" max="20" placeholder="${teamName(m.home)}" value="${p.home_score??''}" data-score="${m.id}:home"><span class="score-dash">-</span><input type="number" min="0" max="20" placeholder="${teamName(m.away)}" value="${p.away_score??''}" data-score="${m.id}:away"></div>
  </div>`;
}

function actualWinnerKey(m){
  if(m.home_score==null||m.away_score==null) return null;
  if(m.home_score>m.away_score) return 'home';
  if(m.away_score>m.home_score) return 'away';
  return 'draw';
}
function goalDistance(p,m){
  if(m.home_score==null||m.away_score==null) return null;
  return Math.abs(Number(p.home_score)-Number(m.home_score))+Math.abs(Number(p.away_score)-Number(m.away_score));
}
function statusForPrediction(p,m){
  const winner=actualWinnerKey(m);
  if(!winner) return {label:'Waiting score',cls:'neutral',icon:'⏳'};
  const dist=goalDistance(p,m);
  if(dist===0) return {label:'Perfect',cls:'perfect',icon:'🥇'};
  if(p.predicted_winner===winner) return {label: dist<=2 ? `${dist} goal${dist===1?'':'s'} away` : 'Winner correct',cls:'close',icon:dist<=2?'🎯':'🟡'};
  return {label:'Currently wrong',cls:'wrong',icon:'🔴'};
}
function crowdPick(summary){
  if(!summary||!summary.total) return null;
  return [summary.home,summary.draw,summary.away].sort((a,b)=>b.percent-a.percent)[0];
}
function summaryItemForPrediction(summary,key){
  if(!summary) return null;
  return key==='home'?summary.home:key==='away'?summary.away:summary.draw;
}
function isBoldPick(p,summary){
  const item=summaryItemForPrediction(summary,p.predicted_winner);
  return summary && summary.total>=3 && item && item.percent>0 && item.percent<=15;
}

function renderLiveView(){
  renderTabs('live');
  $('#submitBtn').style.display='none';
  const live=state.live;
  if(!live || !live.match){
    $('#matches').innerHTML='<div class="notice"><b>No live match yet.</b><br><span class="small">This tab appears when the first match has kicked off.</span></div>';
    return;
  }
  const m=live.match;
  const venue=venueForMatch(m);
  const actual=m.home_score!=null&&m.away_score!=null?`${m.home_score} – ${m.away_score}`:fmtTime(m.kickoff);
  const summary=live.summary||{total:0,home:{percent:0,count:0,label:m.home},draw:{percent:0,count:0,label:'Draw'},away:{percent:0,count:0,label:m.away}};
  const crowd=crowdPick(summary);
  const rows=(live.predictions||[]).map(p=>{
    const status=statusForPrediction(p,m);
    const bold=isBoldPick(p,summary);
    return `<div class="live-pick-row ${status.cls}${bold?' bold-pick-row':''}">
      <div><b>${displayName(p.nickname)}</b><span>${p.predicted_winner_label}</span><em class="status-chip ${status.cls}">${status.icon} ${status.label}</em>${bold?'<em class="status-chip bold">⚡ Bold pick</em>':''}</div>
      <strong>${p.home_score} - ${p.away_score}</strong>
    </div>`;
  }).join('');
  const bar=(item,cls)=>`<div class="percent-row"><div class="percent-label"><span>${item.label}</span><b>${item.percent}%</b></div><div class="percent-track"><div class="percent-fill ${cls}" style="width:${item.percent}%"></div></div><small>${item.count} pick${item.count===1?'':'s'}</small></div>`;

  $('#matches').innerHTML=`
    <div class="live-card">
      <div class="live-badge">LIVE / LATEST 🔴</div>
      <div class="match-top live-match-top">${teamBlock(m.home,'home')}<div class="result-score">${actual}</div>${teamBlock(m.away,'away')}</div>
      <div class="match-info"><div class="meta-row"><span>${matchStageLabel(m)}</span><span>${fmtTime(m.kickoff)} Kuwait</span></div>${venue?`<div class="venue-line">📍 ${venue}</div>`:''}</div>
    </div>
    ${crowd?`<div class="live-card crowd-card"><div class="crowd-label">👥 Crowd pick</div><h2>${crowd.label}</h2><p>${crowd.percent}% of players picked this outcome.</p></div>`:''}
    <div class="live-card">
      <h2>Prediction split</h2>
      <p class="small">Based on ${summary.total} locked prediction${summary.total===1?'':'s'} for this match.</p>
      ${bar(summary.home,'home-fill')}
      ${bar(summary.draw,'draw-fill')}
      ${bar(summary.away,'away-fill')}
    </div>
    <div class="live-card">
      <h2>Everyone’s predictions</h2>
      ${rows||'<div class="notice">No predictions submitted for this match yet.</div>'}
    </div>
  `;
}

function noOpenRoundsHtml(){return `<div class="notice"><b>No open round right now.</b><br><span class="small">The next round will appear automatically when predictions open.</span></div>`;}
function renderMatches(active=roundNames()[0]){
  const openRounds=roundNames();
  if(!openRounds.length){
    renderTabs(hasLiveMatch()?'live':'leaderboard');
    $('#submitBtn').style.display='none';
    $('#matches').innerHTML=noOpenRoundsHtml();
    return;
  }
  if(!openRounds.includes(active)) active=openRounds[0];
  renderTabs(active);
  const matches=roundMatches(active);
  const lockTime=roundLockTime(active);
  $('#submitBtn').style.display='block';
  $('#submitBtn').disabled=false;
  $('#submitBtn').textContent='Lock in picks';
  const grouped={};
  matches.forEach(m=>{const day=fmtDay(m.kickoff); if(!grouped[day]) grouped[day]=[]; grouped[day].push(m);});
  const knockoutRule=isKnockoutRound(active)?' 🏆 Knockout rule: predict the score at the final whistle, including extra time if played. If it is level after extra time, choose Draw. Penalty shootouts do not count.':'';
  const lockNotice=lockTime?`<div class="round-lock open-notice">⏳ Predict every match in this round. Picks lock at the first kickoff: ${fmtFull(lockTime)} Kuwait time. Once submitted, picks are final.${knockoutRule}</div>`:'';
  const html=lockNotice+Object.entries(grouped).map(([day,games])=>`<div class="day-header">${day}</div>${games.map(m=>renderMatch(m)).join('')}`).join('');
  $('#matches').innerHTML=html||'<div class="notice">No matches in this round.</div>';
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const [id,v]=b.dataset.pick.split(':'); picks[id]={...(picks[id]||{}),predicted_winner:v}; renderMatches(active);});
  document.querySelectorAll('[data-score]').forEach(inp=>inp.oninput=()=>{const [id,side]=inp.dataset.score.split(':'); picks[id]={...(picks[id]||{})}; picks[id][side==='home'?'home_score':'away_score']=inp.value===''?null:Number(inp.value);});
}

function renderView(tab=roundNames()[0]){
  if(tab==='leaderboard') return renderLeaderboardView();
  if(tab==='live') return renderLiveView();
  if(pastRoundNames().includes(tab)) return renderPastRound(tab);
  return renderMatches(tab);
}

async function load(){
  try{
    $('#status').textContent='Loading...';
    const [main, live] = await Promise.all([api('get-state'), api('get-live')]);
    state={...main,live};
    if(currentNickname){
      await loadSavedPicksForNickname(false);
      if(hasAnyLockedPicks()){
        nameLocked=true;
        localStorage.setItem('kaifanwc_name_locked','1');
      }
      showApp();
    }else{
      showWelcome();
    }
    $('#status').textContent='';
  }catch(e){
    $('#welcomeStatus').innerHTML=`<span class="bad">${e.message}</span>`;
    $('#status').innerHTML=`<span class="bad">${e.message}</span>`;
  }
}

async function loadSavedPicksForNickname(showStatus=false){
  const nickname=normalizeNickname(currentNickname);
  if(!nickname){picks={}; savedMatchIds=new Set(); return;}
  try{
    if(showStatus && $('#status')) $('#status').textContent='Loading saved picks...';
    const j=await api('get-player?nickname='+encodeURIComponent(nickname));
    picks={};
    savedMatchIds=new Set();
    (j.predictions||[]).forEach(p=>{
      picks[p.match_id]={predicted_winner:p.predicted_winner,home_score:p.home_score,away_score:p.away_score};
      savedMatchIds.add(String(p.match_id));
    });
  }catch(e){
    if($('#status')) $('#status').innerHTML=`<span class="bad">${e.message}</span>`;
    throw e;
  }
}

$('#continueBtn').onclick=setNameFromInput;
$('#welcomeName').addEventListener('keydown',e=>{if(e.key==='Enter') setNameFromInput();});
$('#changeNameBtn').onclick=()=>{
  if(nameLocked) return;
  currentNickname='';
  picks={};
  savedMatchIds=new Set();
  localStorage.removeItem('kaifanwc_name');
  showWelcome();
};
$('#submitBtn').onclick=async()=>{
  try{
    const nickname=normalizeNickname(currentNickname);
    if(!nickname) throw new Error('Enter your name first.');
    if(!activeTab||activeTab==='leaderboard'||activeTab==='live') throw new Error('Choose a round first.');
    if(!roundNames().includes(activeTab)) throw new Error('This round is not open yet.');
    if(hasLockedRound(activeTab)) throw new Error('You have already locked in this round.');
    if(isRoundTimeLocked(activeTab)) throw new Error('This round is already locked.');
    const currentMatches=roundMatches(activeTab);
    const missing=currentMatches.find(m=>{const p=picks[m.id]||{}; return !p.predicted_winner||!Number.isInteger(p.home_score)||!Number.isInteger(p.away_score);});
    if(missing) throw new Error('Please predict the winner/draw and both scores for every match in this round before locking in.');
    const predictions=currentMatches.map(m=>{const p=picks[m.id]; return {match_id:m.id,predicted_winner:p.predicted_winner,home_score:p.home_score,away_score:p.away_score};});
    const j=await api('submit-predictions',{method:'POST',body:JSON.stringify({nickname,predictions})});
    predictions.forEach(p=>savedMatchIds.add(String(p.match_id)));
    nameLocked=true;
    localStorage.setItem('kaifanwc_name',nickname);
    localStorage.setItem('kaifanwc_name_locked','1');
    updateNameUi();
    $('#status').innerHTML=`<span class="ok">Locked in ${j.saved} picks. These picks are now final.</span>`;
    await load();
  }catch(e){
    $('#status').innerHTML=`<span class="bad">${e.message}</span>`;
  }
};

load();

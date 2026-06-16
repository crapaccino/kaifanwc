let state={matches:[],leaderboard:[]};
let picks={};
let activeTab=null;
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

function flagCode(team){return FLAG_CODES[team] || '';} 
function flagImg(team){
  const code=flagCode(team);
  if(!code) return '<span class="flag-fallback">🏳️</span>';
  return `<img class="team-flag-img" src="https://flagcdn.com/${code}.svg" alt="${team} flag" loading="lazy">`;
}
function teamName(team){return SHORT_NAMES[team] || team;}
function normalizeNickname(value){return String(value||'').trim().replace(/\s+/g,' ').toLowerCase();}
function displayName(value){return String(value||'').replace(/\b\w/g,c=>c.toUpperCase());}

const fmtTime=d=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kuwait",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(d));
const fmtDay=d=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kuwait",weekday:"short",day:"numeric",month:"short"}).format(new Date(d)).toUpperCase();
const fmtFull=d=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kuwait",dateStyle:"medium",timeStyle:"short"}).format(new Date(d));

async function api(path, opts={}){
  const r=await fetch('/.netlify/functions/'+path, opts);
  const j=await r.json();
  if(!r.ok) throw new Error(j.error||'Request failed');
  return j;
}

function allRoundNames(){
  return [...new Set(state.matches.map(m=>m.round))].sort((a,b)=>roundLockTime(a)-roundLockTime(b));
}

function visibleRoundNames(){
  const rounds=allRoundNames();
  const now=Date.now();
  return rounds.filter((round,index)=>{
    if(index===0) return true;
    const previousRound=rounds[index-1];
    const previousStart=roundLockTime(previousRound);
    return previousStart && now>=previousStart.getTime();
  });
}

function roundNames(){return visibleRoundNames();}
function displayRoundName(r){return String(r||"").replace("Group Stage - ","").replace("Group Stage ","");}
function roundMatches(round){return state.matches.filter(m=>m.round===round).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));}
function roundLockTime(round){const games=roundMatches(round); return games.length?new Date(games[0].kickoff):null;}
function isRoundTimeLocked(round){const lock=roundLockTime(round); return lock ? Date.now()>=lock.getTime() : false;}
function hasLockedRound(round){return roundMatches(round).some(m=>savedMatchIds.has(String(m.id)));}
function isRoundLocked(round){return isRoundTimeLocked(round)||hasLockedRound(round);}
function hasAnyLockedPicks(){return savedMatchIds.size>0;}

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
  renderView(activeTab || roundNames()[0]);
}

async function setNameFromInput(){
  const nickname=normalizeNickname($('#welcomeName').value);
  if(!nickname){
    $('#welcomeStatus').textContent='Enter your name first.';
    return;
  }
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
  const rounds=roundNames();
  const roundButtons=rounds.map(r=>{
    const locked=isRoundLocked(r);
    return `<button class="${r===active?'active':''}" data-tab="${r}">${displayRoundName(r)} ${locked?'🔒':''}</button>`;
  }).join('');

  $('#roundTabs').innerHTML=roundButtons+`<button class="${active==='leaderboard'?'active':''}" data-tab="leaderboard">Leaderboard</button>`;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>renderView(b.dataset.tab));
}

function renderLeaderboardView(){
  renderTabs('leaderboard');
  const rows=state.leaderboard.map((p,i)=>`
    <tr><td>${i+1}</td><td>${displayName(p.nickname)}</td><td><b>${p.points}</b></td><td>${p.predictions}</td></tr>
  `).join('');
  $('#matches').innerHTML=`
    <div class="leaderboard leaderboard-tab">
      <h2>Leaderboard</h2>
      <table><thead><tr><th>#</th><th>Name</th><th>Pts</th><th>Picks</th></tr></thead><tbody>${rows||'<tr><td colspan="4">No players yet</td></tr>'}</tbody></table>
    </div>`;
  $('#submitBtn').style.display='none';
}

function teamBlock(team,side){
  return `<div class="team ${side}"><span class="team-flag">${flagImg(team)}</span><span class="team-name">${teamName(team)}</span></div>`;
}

function pickLabel(kind,team){
  if(kind==='draw') return 'Draw';
  return `<span class="pick-label-flag">${flagImg(team)}</span><span>${teamName(team)}</span>`;
}

function renderMatch(m,locked){
  const p=picks[m.id]||{};
  const hasResult=m.home_score!=null&&m.away_score!=null;
  const result=hasResult?`<div class="result-score">${m.home_score} – ${m.away_score}</div>`:`<div class="result-score muted-score">${fmtTime(m.kickoff)}</div>`;
  const opts=[['home',pickLabel('team',m.home)],['draw',pickLabel('draw')],['away',pickLabel('team',m.away)]].map(([v,label])=>`
    <button class="${p.predicted_winner===v?'active':''}" ${locked?'disabled':''} data-pick="${m.id}:${v}">${label}</button>
  `).join('');

  return `<div class="match ${locked?'locked':''}">
    <div class="match-top">${teamBlock(m.home,'home')}${result}${teamBlock(m.away,'away')}</div>
    <div class="meta-row"><span class="pill">${locked?'LOCKED':'OPEN'}</span><span>Group ${m.group_name||''}</span><span>${fmtTime(m.kickoff)} Kuwait</span></div>
    <div class="pick">${opts}</div>
    <div class="score">
      <input type="number" min="0" max="20" placeholder="${teamName(m.home)}" value="${p.home_score??''}" ${locked?'disabled':''} data-score="${m.id}:home">
      <span class="score-dash">-</span>
      <input type="number" min="0" max="20" placeholder="${teamName(m.away)}" value="${p.away_score??''}" ${locked?'disabled':''} data-score="${m.id}:away">
    </div>
  </div>`;
}

function renderMatches(active=roundNames()[0]){
  if(!roundNames().includes(active)) active=roundNames()[0];
  renderTabs(active);
  const matches=roundMatches(active);
  const lockTime=roundLockTime(active);
  const timeLocked=isRoundTimeLocked(active);
  const submittedLocked=hasLockedRound(active);
  const locked=timeLocked||submittedLocked;

  $('#submitBtn').style.display='block';
  $('#submitBtn').disabled=locked;
  $('#submitBtn').textContent=submittedLocked?'Picks locked':'Lock in picks';

  const grouped={};
  matches.forEach(m=>{const day=fmtDay(m.kickoff); if(!grouped[day]) grouped[day]=[]; grouped[day].push(m);});

  const lockNotice=lockTime?`<div class="round-lock ${locked?'locked-notice':'open-notice'}">
    ${submittedLocked?`✅ Your picks for this round are locked in and final.`:timeLocked?`🔒 This round is locked. Picks closed at ${fmtFull(lockTime)} Kuwait time. Next round is now open.`:`⏳ Predict every match in this round. Picks become final when you press Lock in picks. Deadline: ${fmtFull(lockTime)} Kuwait time.`}
  </div>`:'';

  const html=lockNotice+Object.entries(grouped).map(([day,games])=>`<div class="day-header">${day}</div>${games.map(m=>renderMatch(m,locked)).join('')}`).join('');
  $('#matches').innerHTML=html||'<div class="notice">No matches in this round.</div>';

  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const [id,v]=b.dataset.pick.split(':'); picks[id]={...(picks[id]||{}),predicted_winner:v}; renderMatches(active);});
  document.querySelectorAll('[data-score]').forEach(inp=>inp.oninput=()=>{const [id,side]=inp.dataset.score.split(':'); picks[id]={...(picks[id]||{})}; picks[id][side==='home'?'home_score':'away_score']=inp.value===''?null:Number(inp.value);});
}

function renderView(tab=roundNames()[0]){
  if(tab==='leaderboard') return renderLeaderboardView();
  if(!roundNames().includes(tab)) tab=roundNames()[0];
  return renderMatches(tab);
}

async function load(){
  try{
    $('#status').textContent='Loading...';
    state=await api('get-state');
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
    if(!activeTab||activeTab==='leaderboard') throw new Error('Choose a round first.');
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
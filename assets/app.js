let state={matches:[],leaderboard:[]};
let picks={};
let activeTab=null;
let nicknameLoadTimer=null;
let lastLoadedNickname='';
let savedMatchIds=new Set();

const $=s=>document.querySelector(s);

const FLAGS={
  "Mexico":"🇲🇽","South Africa":"🇿🇦","South Korea":"🇰🇷","Korea Republic":"🇰🇷","Czechia":"🇨🇿",
  "Canada":"🇨🇦","Bosnia and Herzegovina":"🇧🇦","Qatar":"🇶🇦","Switzerland":"🇨🇭",
  "Brazil":"🇧🇷","Morocco":"🇲🇦","Haiti":"🇭🇹","Scotland":"🏴",
  "United States":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺","Turkey":"🇹🇷",
  "Germany":"🇩🇪","Curacao":"🇨🇼","Ivory Coast":"🇨🇮","Ecuador":"🇪🇨",
  "Netherlands":"🇳🇱","Japan":"🇯🇵","Sweden":"🇸🇪","Tunisia":"🇹🇳",
  "Belgium":"🇧🇪","Egypt":"🇪🇬","Iran":"🇮🇷","New Zealand":"🇳🇿",
  "Spain":"🇪🇸","Cape Verde":"🇨🇻","Saudi Arabia":"🇸🇦","Uruguay":"🇺🇾",
  "France":"🇫🇷","Senegal":"🇸🇳","Iraq":"🇮🇶","Norway":"🇳🇴",
  "Argentina":"🇦🇷","Algeria":"🇩🇿","Austria":"🇦🇹","Jordan":"🇯🇴",
  "Portugal":"🇵🇹","DR Congo":"🇨🇩","Uzbekistan":"🇺🇿","Colombia":"🇨🇴",
  "England":"🏴","Croatia":"🇭🇷","Ghana":"🇬🇭","Panama":"🇵🇦"
};

const SHORT_NAMES={
  "Bosnia and Herzegovina":"Bosnia",
  "South Africa":"South Africa",
  "South Korea":"South Korea",
  "Korea Republic":"South Korea",
  "Saudi Arabia":"Saudi Arabia",
  "New Zealand":"New Zealand",
  "DR Congo":"DR Congo",
  "Ivory Coast":"Ivory Coast"
};

function flag(team){return FLAGS[team] || "🏳️";}
function teamName(team){return SHORT_NAMES[team] || team;}
function normalizeNickname(value){return String(value||'').trim().replace(/\s+/g,' ').toLowerCase();}

const fmtTime=d=>new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kuwait",
  hour:"2-digit",
  minute:"2-digit",
  hour12:false
}).format(new Date(d));

const fmtDay=d=>new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kuwait",
  weekday:"short",
  day:"numeric",
  month:"short"
}).format(new Date(d)).toUpperCase();

const fmtFull=d=>new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kuwait",
  dateStyle:"medium",
  timeStyle:"short"
}).format(new Date(d));

async function api(path, opts={}){
  const r=await fetch('/.netlify/functions/'+path, opts);
  const j=await r.json();
  if(!r.ok) throw new Error(j.error||'Request failed');
  return j;
}

function roundNames(){
  return [...new Set(state.matches.map(m=>m.round))];
}

function displayRoundName(r){
  return String(r||"").replace("Group Stage - ","").replace("Group Stage ","");
}

function roundMatches(round){
  return state.matches
    .filter(m=>m.round===round)
    .sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));
}

function roundLockTime(round){
  const games=roundMatches(round);
  if(!games.length) return null;
  return new Date(games[0].kickoff);
}

function isRoundTimeLocked(round){
  const lock=roundLockTime(round);
  return lock ? Date.now() >= lock.getTime() : false;
}

function hasLockedRound(round){
  return roundMatches(round).some(m=>savedMatchIds.has(String(m.id)));
}

function isRoundLocked(round){
  return isRoundTimeLocked(round) || hasLockedRound(round);
}

function renderTabs(active){
  activeTab=active;
  const rounds=roundNames();

  const roundButtons=rounds.map(r=>{
    const locked=isRoundLocked(r);
    return `<button class="${r===active?'active':''}" data-tab="${r}">
      ${displayRoundName(r)} ${locked?'🔒':''}
    </button>`;
  }).join('');

  $('#roundTabs').innerHTML=roundButtons + `
    <button class="${active==='leaderboard'?'active':''}" data-tab="leaderboard">Leaderboard</button>
  `;

  document.querySelectorAll('[data-tab]').forEach(b=>{
    b.onclick=()=>renderView(b.dataset.tab);
  });
}

function renderLeaderboardView(){
  renderTabs('leaderboard');

  const rows=state.leaderboard.map((p,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${p.nickname}</td>
      <td><b>${p.points}</b></td>
      <td>${p.predictions}</td>
    </tr>
  `).join('');

  $('#matches').innerHTML=`
    <div class="leaderboard leaderboard-tab">
      <h2>Leaderboard</h2>
      <table>
        <thead>
          <tr><th>#</th><th>Name</th><th>Pts</th><th>Picks</th></tr>
        </thead>
        <tbody>${rows||'<tr><td colspan="4">No players yet</td></tr>'}</tbody>
      </table>
    </div>
  `;

  $('#submitBtn').style.display='none';
}

function teamBlock(team, side){
  return `
    <div class="team ${side}">
      <span class="team-flag">${flag(team)}</span>
      <span class="team-name">${teamName(team)}</span>
    </div>
  `;
}

function renderMatch(m, locked){
  const p=picks[m.id]||{};
  const hasResult=m.home_score!=null && m.away_score!=null;

  const result=hasResult
    ? `<div class="result-score">${m.home_score} – ${m.away_score}</div>`
    : `<div class="result-score muted-score">${fmtTime(m.kickoff)}</div>`;

  const opts=[
    ['home',`${flag(m.home)} ${teamName(m.home)}`],
    ['draw','Draw'],
    ['away',`${flag(m.away)} ${teamName(m.away)}`]
  ].map(([v,label])=>`
    <button class="${p.predicted_winner===v?'active':''}" ${locked?'disabled':''} data-pick="${m.id}:${v}">
      ${label}
    </button>
  `).join('');

  return `
    <div class="match ${locked?'locked':''}">
      <div class="match-top">
        ${teamBlock(m.home,"home")}
        ${result}
        ${teamBlock(m.away,"away")}
      </div>

      <div class="meta-row">
        <span class="pill">${locked?'LOCKED':'OPEN'}</span>
        <span>Group ${m.group_name||""}</span>
        <span>${fmtTime(m.kickoff)} Kuwait</span>
      </div>

      <div class="pick">${opts}</div>

      <div class="score">
        <input type="number" min="0" max="20" placeholder="${teamName(m.home)}" value="${p.home_score??''}" ${locked?'disabled':''} data-score="${m.id}:home">
        <span class="score-dash">-</span>
        <input type="number" min="0" max="20" placeholder="${teamName(m.away)}" value="${p.away_score??''}" ${locked?'disabled':''} data-score="${m.id}:away">
      </div>
    </div>
  `;
}

function renderMatches(active=roundNames()[0]){
  renderTabs(active);

  const matches=roundMatches(active);
  const lockTime=roundLockTime(active);
  const timeLocked=isRoundTimeLocked(active);
  const submittedLocked=hasLockedRound(active);
  const locked=timeLocked || submittedLocked;

  $('#submitBtn').style.display='block';
  $('#submitBtn').disabled=locked;
  $('#submitBtn').textContent=submittedLocked?'Picks locked':'Lock in picks';

  const grouped={};
  matches.forEach(m=>{
    const day=fmtDay(m.kickoff);
    if(!grouped[day]) grouped[day]=[];
    grouped[day].push(m);
  });

  const lockNotice=lockTime ? `
    <div class="round-lock ${locked?'locked-notice':'open-notice'}">
      ${submittedLocked
        ? `✅ Your picks for this round are locked in and final.`
        : timeLocked
          ? `🔒 This round is locked. Picks closed at ${fmtFull(lockTime)} Kuwait time.`
          : `⏳ Predict every match in this round. Picks become final when you press Lock in picks. Deadline: ${fmtFull(lockTime)} Kuwait time.`
      }
    </div>
  ` : '';

  const html=lockNotice + Object.entries(grouped).map(([day,games])=>`
    <div class="day-header">${day}</div>
    ${games.map(m=>renderMatch(m,locked)).join('')}
  `).join('');

  $('#matches').innerHTML=html||'<div class="notice">No matches in this round.</div>';

  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{
    const [id,v]=b.dataset.pick.split(':');
    picks[id]={...(picks[id]||{}),predicted_winner:v};
    renderMatches(active);
  });

  document.querySelectorAll('[data-score]').forEach(inp=>inp.oninput=()=>{
    const [id,side]=inp.dataset.score.split(':');
    picks[id]={...(picks[id]||{})};
    picks[id][side==='home'?'home_score':'away_score']=inp.value===''?null:Number(inp.value);
  });
}

function renderView(tab=roundNames()[0]){
  if(tab==='leaderboard') return renderLeaderboardView();
  return renderMatches(tab);
}

async function load(){
  $('#status').textContent='Loading...';
  state=await api('get-state');

  const rounds=roundNames();
  const preferred=activeTab && (activeTab==='leaderboard' || rounds.includes(activeTab)) ? activeTab : rounds[0];
  renderView(preferred);

  $('#status').textContent='';
}

async function loadSavedPicksForNickname(showStatus=false){
  const nickname=normalizeNickname($('#nickname').value);

  if(!nickname){
    picks={};
    savedMatchIds=new Set();
    lastLoadedNickname='';
    renderView(activeTab || roundNames()[0]);
    $('#status').textContent='';
    return;
  }

  if(nickname===lastLoadedNickname) return;

  try{
    if(showStatus) $('#status').textContent='Loading saved picks...';

    const j=await api('get-player?nickname='+encodeURIComponent(nickname));
    picks={};
    savedMatchIds=new Set();

    (j.predictions||[]).forEach(p=>{
      picks[p.match_id]={
        predicted_winner:p.predicted_winner,
        home_score:p.home_score,
        away_score:p.away_score
      };
      savedMatchIds.add(String(p.match_id));
    });

    lastLoadedNickname=nickname;
    renderView(activeTab || roundNames()[0]);

    if(showStatus){
      $('#status').textContent=j.player?'Loaded your saved picks.':'No saved picks for this nickname yet.';
    }else if(j.player){
      $('#status').textContent='Loaded your saved picks.';
    }
  }catch(e){
    $('#status').innerHTML=`<span class="bad">${e.message}</span>`;
  }
}

$('#nickname').addEventListener('input',()=>{
  clearTimeout(nicknameLoadTimer);
  nicknameLoadTimer=setTimeout(()=>loadSavedPicksForNickname(false),650);
});

$('#nickname').addEventListener('blur',()=>{
  clearTimeout(nicknameLoadTimer);
  loadSavedPicksForNickname(true);
});

$('#submitBtn').onclick=async()=>{
  try{
    const nickname=normalizeNickname($('#nickname').value);
    if(!nickname) throw new Error('Enter your nickname first.');
    if(!activeTab || activeTab==='leaderboard') throw new Error('Choose a round first.');
    if(hasLockedRound(activeTab)) throw new Error('You have already locked in this round.');
    if(isRoundTimeLocked(activeTab)) throw new Error('This round is already locked.');

    const currentMatches=roundMatches(activeTab);
    const missing=currentMatches.find(m=>{
      const p=picks[m.id]||{};
      return !p.predicted_winner || !Number.isInteger(p.home_score) || !Number.isInteger(p.away_score);
    });

    if(missing){
      throw new Error('Please predict the winner/draw and both scores for every match in this round before locking in.');
    }

    const predictions=currentMatches.map(m=>{
      const p=picks[m.id];
      return {
        match_id:m.id,
        predicted_winner:p.predicted_winner,
        home_score:p.home_score,
        away_score:p.away_score
      };
    });

    const j=await api('submit-predictions',{
      method:'POST',
      body:JSON.stringify({nickname,predictions})
    });

    predictions.forEach(p=>savedMatchIds.add(String(p.match_id)));
    lastLoadedNickname=nickname;
    $('#status').innerHTML=`<span class="ok">Locked in ${j.saved} picks. These picks are now final.</span>`;
    await load();
  }catch(e){
    $('#status').innerHTML=`<span class="bad">${e.message}</span>`;
  }
};

load();
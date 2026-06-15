let state={matches:[],leaderboard:[]};
let picks={};
let activeTab=null;
let nicknameLoadTimer=null;
let lastLoadedNickname='';

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

function isRoundLocked(round){
  const lock=roundLockTime(round);
  return lock ? Date.now() >= lock.getTime() : false;
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

function renderMatch(m, roundLocked){
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
    <button class="${p.predicted_winner===v?'active':''}" ${roundLocked?'disabled':''} data-pick="${m.id}:${v}">
      ${label}
    </button>
  `).join('');

  return `
    <div class="match ${roundLocked?'locked':''}">
      <div class="match-top">
        ${teamBlock(m.home,"home")}
        ${result}
        ${teamBlock(m.away,"away")}
      </div>

      <div class="meta-row">
        <span class="pill">${roundLocked?'ROUND LOCKED':'OPEN'}</span>
        <span>Group ${m.group_name||""}</span>
        <span>${fmtTime(m.kickoff)} Kuwait</span>
      </div>

      <div class="pick">${opts}</div>

      <div class="score">
        <input type="number" min="0" max="20" placeholder="${teamName(m.home)}" value="${p.home_score??''}" ${roundLocked?'disabled':''} data-score="${m.id}:home">
        <span class="score-dash">-</span>
        <input type="number" min="0" max="20" placeholder="${teamName(m.away)}" value="${p.away_score??''}" ${roundLocked?'disabled':''} data-score="${m.id}:away">
      </div>
    </div>
  `;
}

function renderMatches(active=roundNames()[0]){
  renderTabs(active);
  $('#submitBtn').style.display='block';

  const matches=roundMatches(active);
  const lockTime=roundLockTime(active);
  const roundLocked=isRoundLocked(active);

  const grouped={};
  matches.forEach(m=>{
    const day=fmtDay(m.kickoff);
    if(!grouped[day]) grouped[day]=[];
    grouped[day].push(m);
  });

  const lockNotice=lockTime ? `
    <div class="round-lock ${roundLocked?'locked-notice':'open-notice'}">
      ${roundLocked
        ? `🔒 This round is locked. Picks closed at ${fmtFull(lockTime)} Kuwait time.`
        : `⏳ This full round locks at ${fmtFull(lockTime)} Kuwait time, before the first game starts.`
      }
    </div>
  ` : '';

  const html=lockNotice + Object.entries(grouped).map(([day,games])=>`
    <div class="day-header">${day}</div>
    ${games.map(m=>renderMatch(m,roundLocked)).join('')}
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
  const nickname=$('#nickname').value.trim();

  if(!nickname){
    picks={};
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

    (j.predictions||[]).forEach(p=>picks[p.match_id]={
      predicted_winner:p.predicted_winner,
      home_score:p.home_score,
      away_score:p.away_score
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
    const nickname=$('#nickname').value.trim();

    const predictions=Object.entries(picks)
      .filter(([_,p])=>p.predicted_winner)
      .map(([match_id,p])=>({
        match_id,
        predicted_winner:p.predicted_winner,
        home_score:Number.isInteger(p.home_score)?p.home_score:null,
        away_score:Number.isInteger(p.away_score)?p.away_score:null
      }));

    const j=await api('submit-predictions',{
      method:'POST',
      body:JSON.stringify({nickname,predictions})
    });

    lastLoadedNickname=nickname;
    $('#status').innerHTML=`<span class="ok">Locked in ${j.saved} picks.</span>`;
    await load();
  }catch(e){
    $('#status').innerHTML=`<span class="bad">${e.message}</span>`;
  }
};

load();
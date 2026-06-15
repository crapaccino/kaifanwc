let state={matches:[],leaderboard:[]};
let picks={};

const $=s=>document.querySelector(s);

const fmt=d=>new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kuwait",
  dateStyle:"medium",
  timeStyle:"short"
}).format(new Date(d));

const fmtDay=d=>new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kuwait",
  weekday:"long",
  day:"numeric",
  month:"long",
  year:"numeric"
}).format(new Date(d));

async function api(path, opts={}){
  const r=await fetch('/.netlify/functions/'+path, opts);
  const j=await r.json();
  if(!r.ok) throw new Error(j.error||'Request failed');
  return j;
}

function actualWinner(m){
  if(m.home_score==null||m.away_score==null)return null;
  if(m.home_score>m.away_score)return 'home';
  if(m.away_score>m.home_score)return 'away';
  return 'draw';
}

function renderLeaderboard(){
  const rows=state.leaderboard.map((p,i)=>`<tr><td>${i+1}</td><td>${p.nickname}</td><td><b>${p.points}</b></td><td>${p.predictions}</td></tr>`).join('');
  $('#leaderboard').innerHTML=`<table><thead><tr><th>#</th><th>Name</th><th>Pts</th><th>Picks</th></tr></thead><tbody>${rows||'<tr><td colspan="4">No players yet</td></tr>'}</tbody></table>`;
}

function roundNames(){
  return [...new Set(state.matches.map(m=>m.round))];
}

function renderTabs(active){
  $('#roundTabs').innerHTML=roundNames().map(r=>`<button class="${r===active?'active':''}" data-round="${r}">${r}</button>`).join('');
  document.querySelectorAll('[data-round]').forEach(b=>b.onclick=()=>renderMatches(b.dataset.round));
}

function renderMatch(m, now){
  const locked=new Date(m.kickoff).getTime()<=now;
  const p=picks[m.id]||{};
  const result=m.home_score!=null?`<span class="pill">Result: ${m.home_score}-${m.away_score}</span>`:'';

  const opts=[
    ['home',m.home],
    ['draw','Draw'],
    ['away',m.away]
  ].map(([v,label])=>`<button class="${p.predicted_winner===v?'active':''}" ${locked?'disabled':''} data-pick="${m.id}:${v}">${label}</button>`).join('');

  return `
    <div class="match ${locked?'locked':''}">
      <div class="teams">
        <span>${m.home}</span>
        <span class="vs">vs</span>
        <span>${m.away}</span>
      </div>
      <p class="small">
        ${m.round} ${m.group_name?` • Group ${m.group_name}`:''} • ${fmt(m.kickoff)} Kuwait time ${locked?' • Locked':''} ${result}
      </p>
      <div class="pick">${opts}</div>
      <div class="score">
        <input type="number" min="0" max="20" placeholder="${m.home}" value="${p.home_score??''}" ${locked?'disabled':''} data-score="${m.id}:home">
        <input type="number" min="0" max="20" placeholder="${m.away}" value="${p.away_score??''}" ${locked?'disabled':''} data-score="${m.id}:away">
      </div>
    </div>
  `;
}

function renderMatches(active=roundNames()[0]){
  renderTabs(active);

  const now=Date.now();
  const matches=state.matches
    .filter(m=>m.round===active)
    .sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));

  const grouped={};

  matches.forEach(m=>{
    const day=fmtDay(m.kickoff);
    if(!grouped[day]) grouped[day]=[];
    grouped[day].push(m);
  });

  const html=Object.entries(grouped).map(([day,games])=>`
    <div class="day-header">📅 ${day}</div>
    ${games.map(m=>renderMatch(m,now)).join('')}
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

async function load(){
  $('#status').textContent='Loading...';
  state=await api('get-state');
  renderLeaderboard();
  renderMatches();
  $('#status').textContent='';
}

$('#loadBtn').onclick=async()=>{
  const nickname=$('#nickname').value.trim();
  if(!nickname)return $('#status').textContent='Enter your nickname first.';
  const j=await api('get-player?nickname='+encodeURIComponent(nickname));
  picks={};
  (j.predictions||[]).forEach(p=>picks[p.match_id]={
    predicted_winner:p.predicted_winner,
    home_score:p.home_score,
    away_score:p.away_score
  });
  renderMatches(document.querySelector('[data-round].active')?.dataset.round);
  $('#status').textContent=j.player?'Loaded your previous picks.':'No saved picks for this nickname yet.';
};

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

    $('#status').innerHTML=`<span class="ok">Saved ${j.saved} predictions.</span>`;
    await load();
  }catch(e){
    $('#status').innerHTML=`<span class="bad">${e.message}</span>`;
  }
};

load();

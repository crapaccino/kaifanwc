let state={matches:[],leaderboard:[]};
let predictionRows=[];

const $=s=>document.querySelector(s);
const fmt=d=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuwait',dateStyle:'medium',timeStyle:'short'}).format(new Date(d));

async function api(path, opts={}){
  opts.headers={...(opts.headers||{}),'Content-Type':'application/json','x-admin-password':$('#adminPass').value};
  const r=await fetch('/.netlify/functions/'+path, opts);
  const j=await r.json();
  if(!r.ok) throw new Error(j.error||'Request failed');
  return j;
}

async function getState(){
  const r=await fetch('/.netlify/functions/get-state');
  state=await r.json();
  render();
}

function renderLeaderboard(){
  const rows=state.leaderboard.map((p,i)=>`
    <tr><td>${i+1}</td><td>${p.nickname}</td><td><b>${p.points}</b></td><td>${p.predictions}</td></tr>
  `).join('');
  $('#leaderboard').innerHTML=`<table><thead><tr><th>#</th><th>Name</th><th>Pts</th><th>Picks</th></tr></thead><tbody>${rows||'<tr><td colspan="4">No players yet</td></tr>'}</tbody></table>`;
}

function renderMatchesAdmin(){
  $('#adminMatches').innerHTML=state.matches.map(m=>`
    <div class="match">
      <b>${m.home} vs ${m.away}</b>
      <p class="small">${m.round} • ${fmt(m.kickoff)} Kuwait • ID ${m.id}</p>
      <div class="row">
        <input type="number" min="0" value="${m.home_score??''}" placeholder="${m.home}" data-h="${m.id}">
        <input type="number" min="0" value="${m.away_score??''}" placeholder="${m.away}" data-a="${m.id}">
        <button data-result="${m.id}">Save result</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('[data-result]').forEach(btn=>btn.onclick=async()=>{
    try{
      const id=btn.dataset.result;
      const h=document.querySelector(`[data-h="${id}"]`).value;
      const a=document.querySelector(`[data-a="${id}"]`).value;
      await api('admin-set-result',{method:'POST',body:JSON.stringify({match_id:id,home_score:h===''?null:Number(h),away_score:a===''?null:Number(a)})});
      $('#adminStatus').innerHTML='<span class="ok">Result saved.</span>';
      await getState();
      if(predictionRows.length) await loadPredictions();
    }catch(e){
      $('#adminStatus').innerHTML=`<span class="bad">${e.message}</span>`;
    }
  });
}

function render(){
  renderLeaderboard();
  renderMatchesAdmin();
}

function filteredPredictionRows(){
  const q=($('#searchPredictions')?.value||'').trim().toLowerCase();
  if(!q) return predictionRows;
  return predictionRows.filter(r=>[
    r.nickname,r.round,r.group_name,r.home,r.away,r.predicted_winner,
    `${r.predicted_home_score}-${r.predicted_away_score}`
  ].filter(Boolean).join(' ').toLowerCase().includes(q));
}

function predictionOption(value,label,current){
  return `<option value="${value}" ${current===value?'selected':''}>${label}</option>`;
}

function renderPredictions(){
  const rows=filteredPredictionRows();

  if(!predictionRows.length){
    $('#predictionsTable').innerHTML='<div class="notice">No predictions submitted yet.</div>';
    return;
  }

  $('#predictionsTable').innerHTML=`
    <table class="admin-predictions-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Round</th>
          <th>Match</th>
          <th>Pick</th>
          <th>Score</th>
          <th>Actual</th>
          <th>Pts</th>
          <th>Edit</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r=>`
          <tr>
            <td><b>${r.nickname}</b></td>
            <td>${r.round}</td>
            <td>${r.home} vs ${r.away}<br><span class="small">${fmt(r.kickoff)} Kuwait</span></td>
            <td>
              <select data-winner="${r.prediction_id}">
                ${predictionOption('home',r.home,r.predicted_winner_key)}
                ${predictionOption('draw','Draw',r.predicted_winner_key)}
                ${predictionOption('away',r.away,r.predicted_winner_key)}
              </select>
            </td>
            <td>
              <div class="admin-score-edit">
                <input type="number" min="0" max="20" value="${r.predicted_home_score}" data-home-score="${r.prediction_id}" aria-label="${r.home} predicted score">
                <span>-</span>
                <input type="number" min="0" max="20" value="${r.predicted_away_score}" data-away-score="${r.prediction_id}" aria-label="${r.away} predicted score">
              </div>
            </td>
            <td>${r.actual_home_score==null||r.actual_away_score==null?'—':`${r.actual_home_score} - ${r.actual_away_score}`}</td>
            <td><b>${r.points}</b></td>
            <td><button class="secondary" data-save-prediction="${r.prediction_id}">Save</button></td>
          </tr>
        `).join('') || '<tr><td colspan="8">No matching predictions.</td></tr>'}
      </tbody>
    </table>
  `;

  document.querySelectorAll('[data-save-prediction]').forEach(btn=>btn.onclick=async()=>{
    try{
      const id=btn.dataset.savePrediction;
      const predicted_winner=document.querySelector(`[data-winner="${id}"]`).value;
      const home_score=Number(document.querySelector(`[data-home-score="${id}"]`).value);
      const away_score=Number(document.querySelector(`[data-away-score="${id}"]`).value);
      await api('admin-update-prediction',{method:'POST',body:JSON.stringify({prediction_id:id,predicted_winner,home_score,away_score})});
      $('#adminStatus').innerHTML='<span class="ok">Prediction updated.</span>';
      await getState();
      await loadPredictions();
    }catch(e){
      $('#adminStatus').innerHTML=`<span class="bad">${e.message}</span>`;
    }
  });
}

async function loadPredictions(){
  try{
    $('#adminStatus').textContent='Loading predictions...';
    const j=await api('admin-predictions');
    predictionRows=j.rows||[];
    renderPredictions();
    $('#adminStatus').innerHTML=`<span class="ok">Loaded ${predictionRows.length} predictions.</span>`;
  }catch(e){
    $('#adminStatus').innerHTML=`<span class="bad">${e.message}</span>`;
  }
}

function exportCsv(){
  const rows=filteredPredictionRows();
  if(!rows.length) return;

  const headers=['nickname','round','group_name','kickoff_kuwait','home','away','predicted_winner','predicted_home_score','predicted_away_score','actual_home_score','actual_away_score','points'];
  const csv=[headers.join(',')].concat(rows.map(r=>headers.map(h=>{
    const value=h==='kickoff_kuwait'?fmt(r.kickoff):(r[h]??'');
    return `"${String(value).replaceAll('"','""')}"`;
  }).join(','))).join('\n');

  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='kaifanwc-predictions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

$('#loadPredictions').onclick=loadPredictions;
$('#searchPredictions').oninput=renderPredictions;
$('#exportCsv').onclick=exportCsv;

$('#saveMatch').onclick=async()=>{
  try{
    const body={id:$('#id').value||undefined,round:$('#round').value,group_name:$('#group').value,home:$('#home').value,away:$('#away').value,kickoff:$('#kickoff').value};
    await api('admin-save-match',{method:'POST',body:JSON.stringify(body)});
    $('#adminStatus').innerHTML='<span class="ok">Match saved.</span>';
    ['id','round','group','home','away','kickoff'].forEach(x=>$('#'+x).value='');
    await getState();
  }catch(e){
    $('#adminStatus').innerHTML=`<span class="bad">${e.message}</span>`;
  }
};

$('#seedRound16').onclick=async()=>{
  try{
    const last_winner=$('#round16LastWinner').value;
    const result=await api('admin-seed-round16',{method:'POST',body:JSON.stringify({last_winner})});
    $('#adminStatus').innerHTML=`<span class="ok">Loaded ${result.count} Round of 16 fixtures. Times will display in Kuwait time.</span>`;
    await getState();
  }catch(e){
    $('#adminStatus').innerHTML=`<span class="bad">${e.message}</span>`;
  }
};

$('#seedSemiFinals').onclick=async()=>{
  try{
    const result=await api('admin-seed-semi-finals',{method:'POST'});
    $('#adminStatus').innerHTML=`<span class="ok">Loaded ${result.count} Semi-final fixtures. Both kickoffs display at 22:00 Kuwait time.</span>`;
    await getState();
  }catch(e){
    $('#adminStatus').innerHTML=`<span class="bad">${e.message}</span>`;
  }
};

getState();

(() => {
  const RATING = {France:96,England:94,Spain:93,Argentina:92,Brazil:91,Portugal:89,Germany:88,Netherlands:85,Uruguay:84,Belgium:82,Croatia:80,Colombia:79,'United States':77,Morocco:77,Switzerland:76,Austria:75,Senegal:75,Sweden:74,Norway:73,Mexico:73,Japan:72,Turkey:72,Ecuador:71,Ghana:70,'South Korea':70,Australia:69,Canada:68,Scotland:68,Egypt:68,'Ivory Coast':68,Algeria:67,Paraguay:66,Iran:66,Tunisia:65,'Saudi Arabia':64,'South Africa':63,Czechia:63,Qatar:62,'Bosnia and Herzegovina':62,Panama:61,'New Zealand':60,Iraq:59,Jordan:58,Uzbekistan:58,'DR Congo':58,Haiti:55,'Cape Verde':55,Curacao:53};
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
  async function state(){ const r=await fetch('/.netlify/functions/get-state?ts='+Date.now()); return await r.json(); }
  function tab(){ const b=document.querySelector('#roundTabs [data-tab].active'); if(!b) return null; const t=b.dataset.tab; return t==='leaderboard'||t==='live'?null:t; }
  function games(s,r){ return (s.matches||[]).filter(m=>m.round===r).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)); }
  function plan(m){
    const gap=clamp((RATING[m.home]||65)-(RATING[m.away]||65),-30,30);
    const draw=clamp(.28-Math.abs(gap)*.004,.16,.30);
    const home=clamp((1-draw)/2+gap*.012,.12,.78);
    const x=Math.random();
    const out=x<home?'home':(x<home+draw?'draw':'away');
    let h,a;
    if(out==='draw') [h,a]=pick(Math.abs(gap)<=5?[[0,0],[1,1],[1,1],[2,2]]:[[0,0],[1,1],[1,1]]);
    else { const s=pick(Math.abs(gap)>=15&&Math.random()<.45?[[2,0],[3,0],[3,1],[4,1]]:[[1,0],[2,0],[2,1],[2,1],[3,1]]); [h,a]=out==='home'?s:[s[1],s[0]]; }
    return {id:String(m.id),out,h,a};
  }
  function setScore(p){
    const h=document.querySelector(`[data-score="${p.id}:home"]`), a=document.querySelector(`[data-score="${p.id}:away"]`);
    if(h){h.value=p.h;h.dispatchEvent(new Event('input',{bubbles:true}));}
    if(a){a.value=p.a;a.dispatchEvent(new Event('input',{bubbles:true}));}
  }
  async function apply(plans){ plans.forEach(setScore); for(const p of plans){ const b=document.querySelector(`[data-pick="${p.id}:${p.out}"]`); if(b)b.click(); await new Promise(r=>setTimeout(r,35)); } }
  async function one(id){ const r=tab(); if(!r)return; const s=await state(); const m=games(s,r).find(x=>String(x.id)===String(id)); if(m) await apply([plan(m)]); }
  async function all(){ const r=tab(); if(!r)return; const s=await state(); await apply(games(s,r).map(plan)); }
  function inject(){
    if(!tab()) return;
    const cards=[...document.querySelectorAll('.match')].filter(x=>x.querySelector('[data-pick]'));
    if(!cards.length) return;
    const box=document.querySelector('#matches');
    if(box&&!box.querySelector('.quick-pick-all')){ const c=document.createElement('div'); c.className='quick-pick-all round-lock open-notice'; c.innerHTML='<div><b>Need help?</b><br><span class="small">Quick Pick fills a sensible result and score.</span></div><button type="button" class="secondary" id="quickPickAllBtn">🎲 Quick Pick All</button>'; const first=box.querySelector('.day-header'); box.insertBefore(c,first||box.firstChild); c.querySelector('#quickPickAllBtn').onclick=all; }
    cards.forEach(card=>{ if(card.querySelector('.quick-pick-one')) return; const b=card.querySelector('[data-pick]'); const id=b.dataset.pick.split(':')[0]; const row=document.createElement('div'); row.className='auto-pick-row'; row.innerHTML='<button type="button" class="secondary quick-pick-one">🎲 Quick Pick</button>'; const score=card.querySelector('.score'); if(score) score.insertAdjacentElement('afterend',row); row.querySelector('button').onclick=()=>one(id); });
  }
  window.addEventListener('load',()=>{setInterval(inject,800);inject();});
})();
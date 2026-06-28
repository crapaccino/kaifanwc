(() => {
  const RATINGS = {
    "Argentina":94,"France":93,"Spain":92,"England":91,"Brazil":90,"Portugal":89,"Netherlands":87,"Germany":86,
    "Croatia":84,"Uruguay":83,"Belgium":82,"Colombia":81,"Morocco":80,"Switzerland":79,"USA":78,"Mexico":78,
    "Japan":77,"Senegal":77,"Austria":76,"Ecuador":76,"South Korea":75,"Ivory Coast":74,"Turkey":74,"Sweden":73,
    "Canada":72,"Norway":72,"Algeria":72,"Ghana":71,"Australia":70,"Czechia":70,"Iran":70,"Scotland":69,
    "Egypt":69,"Tunisia":68,"Saudi Arabia":67,"South Africa":67,"Qatar":66,"Uzbekistan":66,"Iraq":65,"DR Congo":65,
    "Panama":64,"Jordan":63,"New Zealand":63,"Cape Verde":62,"Bosnia":62,"Paraguay":62,"Haiti":60,"Curacao":58
  };
  const KNOCKOUT_RE = /(round of 32|round of 16|quarter|semi|final)/i;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function percentModel(home,away){
    const h=RATINGS[home]||70, a=RATINGS[away]||70, diff=h-a;
    let draw=clamp(26-Math.abs(diff)*0.45,12,28);
    let homeWin=clamp((100-draw)/2+diff*1.45,6,88);
    let awayWin=100-draw-homeWin;
    if(awayWin<4){homeWin-=4-awayWin;awayWin=4;}
    if(homeWin<4){awayWin-=4-homeWin;homeWin=4;}
    const total=homeWin+draw+awayWin;
    return {home:Math.round(homeWin/total*100),draw:Math.round(draw/total*100),away:Math.round(awayWin/total*100)};
  }
  function expectedScores(home,away,p){
    const fav=p.home>=p.away?'home':'away';
    const max=Math.max(p.home,p.away);
    const close=Math.abs(p.home-p.away)<=10;
    if(close)return ['1-1','2-1','1-0'];
    if(max>=75)return fav==='home'?['3-0','2-0','3-1']:['0-3','0-2','1-3'];
    if(max>=62)return fav==='home'?['2-0','2-1','3-1']:['0-2','1-2','1-3'];
    return fav==='home'?['1-0','2-1','1-1']:['0-1','1-2','1-1'];
  }
  function edge(p){
    const max=Math.max(p.home,p.away), gap=Math.abs(p.home-p.away);
    if(max>=75)return 'Heavy favorite';
    if(max>=62)return 'Clear favorite';
    if(gap<=10)return 'Very close';
    return 'Slight edge';
  }
  function row(label,pct){
    return '<div class="helper-row"><div class="helper-row-label"><span>'+label+'</span><b>'+pct+'%</b></div><div class="helper-track"><div class="helper-fill" style="width:'+pct+'%"></div></div></div>';
  }
  function card(home,away){
    const p=percentModel(home,away), scores=expectedScores(home,away,p);
    return '<div class="pick-helper-card" data-helper="1"><div class="helper-title">Match insight</div><div class="helper-edge">'+edge(p)+' - estimated from team strength</div>'+row(home,p.home)+row('Draw',p.draw)+row(away,p.away)+'<div class="helper-scores"><span>Common scores</span><b>'+scores.join(' / ')+'</b></div><div class="helper-note">Use this as a simple guide, not a guarantee.</div></div>';
  }
  function activeRoundName(){
    const active=document.querySelector('#roundTabs button.active[data-tab]');
    return String(active?.dataset?.tab||active?.textContent||'');
  }
  function isKnockoutRound(){
    return KNOCKOUT_RE.test(activeRoundName());
  }
  function fixDeadlineText(){
    const notice=document.querySelector('.round-lock.open-notice');
    if(!notice || notice.dataset.fixedDeadline==='1')return;
    const text=notice.textContent||'';
    if(text.indexOf('Deadline:')===-1)return;
    let updated=text
      .replace('Picks close 2 hours before the first kickoff.','Picks lock at the first kickoff.')
      .replace('Picks become final when you press Lock in picks.','Picks lock at the first kickoff.');
    if(isKnockoutRound()){
      updated += ' 🏆 Knockout rule: predict the score at the final whistle, including extra time if played. If it is level after extra time, choose Draw. Penalty shootouts do not count.';
    }
    notice.textContent=updated;
    notice.dataset.fixedDeadline='1';
  }
  function inject(){
    document.querySelectorAll('.match').forEach(match=>{
      if(match.querySelector('[data-helper="1"]'))return;
      const home=match.querySelector('.team.home .team-name')?.textContent?.trim();
      const away=match.querySelector('.team.away .team-name')?.textContent?.trim();
      const info=match.querySelector('.match-info');
      if(!home||!away||!info)return;
      info.insertAdjacentHTML('afterend',card(home,away));
    });
    fixDeadlineText();
  }
  function start(){
    const target=document.querySelector('#matches');
    if(!target)return;
    new MutationObserver(inject).observe(target,{childList:true,subtree:true});
    inject();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

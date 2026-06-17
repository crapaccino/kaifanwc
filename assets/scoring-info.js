(() => {
function inject(){
 const board=document.querySelector('#matches');
 if(!board)return;
 if(document.querySelector('#scoringInfoBtn'))return;
 const title=Array.from(document.querySelectorAll('h1,h2,h3')).find(el=>/leaderboard/i.test(el.textContent||''));
 if(!title)return;
 const btn=document.createElement('button');
 btn.id='scoringInfoBtn';
 btn.className='secondary';
 btn.textContent='? Scoring';
 btn.style.marginLeft='10px';
 title.appendChild(btn);
 btn.onclick=()=>{
  const old=document.getElementById('scoringModal'); if(old) old.remove();
  const modal=document.createElement('div');
  modal.id='scoringModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999';
  modal.innerHTML='<div style="background:white;max-width:520px;width:100%;border-radius:20px;padding:20px;max-height:85vh;overflow:auto"><h2>🏆 Kaifan WC Scoring</h2><h3>Match Predictions</h3><p>Exact score: <b>5 pts</b><br>Correct result: <b>2 pts</b><br>Wrong prediction: <b>0 pts</b></p><p><small>Exact score is worth 5 total points, not 5 + 2.</small></p><h3>Final Match</h3><p>Exact score: <b>10 pts</b><br>Correct winner: <b>4 pts</b></p><h3>Bonus Predictions</h3><p>World Cup Winner: <b>15 pts</b><br>Player of the Tournament: <b>10 pts</b><br>Golden Boot: <b>10 pts</b><br>Golden Glove: <b>8 pts</b></p><button id="closeScoreModal">Close</button></div>';
  document.body.appendChild(modal);
  document.getElementById('closeScoreModal').onclick=()=>modal.remove();
  modal.onclick=e=>{ if(e.target===modal) modal.remove(); };
 };
}
window.addEventListener('load',()=>{
 setInterval(inject,1000);
 inject();
});
})();
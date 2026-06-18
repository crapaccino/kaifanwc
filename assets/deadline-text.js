(function(){
  function patch(){
    var notice=document.querySelector('.round-lock.open-notice');
    if(!notice)return;
    var text=notice.textContent||'';
    notice.textContent=text
      .replace('Picks become final when you press Lock in picks.','Picks close at the first kickoff.')
      .replace('Picks close 2 hours before the first kickoff.','Picks close at the first kickoff.');
  }
  setInterval(patch,1000);
  patch();
})();
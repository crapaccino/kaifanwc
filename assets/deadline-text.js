(function(){
  function pad(n){return String(n).padStart(2,'0');}
  function patch(){
    var notice=document.querySelector('.round-lock.open-notice');
    if(!notice)return;
    var text=notice.textContent||'';
    var re=/Deadline:\s*(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4}),\s*(\d{2}):(\d{2})\s+Kuwait time/;
    var m=text.match(re);
    if(!m)return;
    var months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    var d=new Date(Date.UTC(Number(m[3]),months[m[2]],Number(m[1]),Number(m[4])-2,Number(m[5])));
    var fixed='Deadline: '+Number(d.getUTCDate())+' '+m[2]+' '+d.getUTCFullYear()+', '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+' Kuwait time';
    notice.textContent=text.replace(re,fixed).replace('Picks become final when you press Lock in picks.','Picks close 2 hours before the first kickoff.');
  }
  setInterval(patch,1000);
  patch();
})();
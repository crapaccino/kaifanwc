var kaifanRandomDone=false;
function kaifanShowShortcut(){
  if(!kaifanRandomDone)return;
  var panel=document.querySelector('.quick-pick-all');
  if(panel)panel.classList.add('quick-pick-picked');
}
document.addEventListener('click',function(e){
  var b=e.target.closest('#quickPickAllBtn');
  if(!b)return;
  kaifanRandomDone=true;
  setTimeout(kaifanShowShortcut,300);
  setTimeout(kaifanShowShortcut,900);
  setTimeout(kaifanShowShortcut,1600);
});
window.addEventListener('load',function(){setInterval(kaifanShowShortcut,500);});

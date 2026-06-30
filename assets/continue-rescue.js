(function(){
  function normalizeName(value){
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function showWelcomeError(message){
    var status = document.getElementById('welcomeStatus');
    if (status) status.innerHTML = '<span class="bad">' + message + '</span>';
  }

  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('continueBtn');
    var input = document.getElementById('welcomeName');
    var welcome = document.getElementById('welcomeScreen');
    var app = document.getElementById('appScreen');
    if (!btn || !input || !welcome || !app) return;

    btn.addEventListener('click', function(){
      var nickname = normalizeName(input.value);
      if (!nickname) return;

      setTimeout(function(){
        var stillOnWelcome = !welcome.classList.contains('app-hidden') && app.classList.contains('app-hidden');
        if (!stillOnWelcome) return;

        try {
          localStorage.setItem('kaifanwc_name', nickname);
          localStorage.removeItem('kaifanwc_name_locked');
          showWelcomeError('Loading took too long. Refreshing once...');
          window.location.reload();
        } catch (e) {
          showWelcomeError(e.message || 'Could not continue. Please refresh and try again.');
        }
      }, 1500);
    });
  });
})();

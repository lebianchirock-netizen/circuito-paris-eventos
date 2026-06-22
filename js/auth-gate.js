// Trava de acesso simples ao painel de controle.
// Guarda a sessão em sessionStorage: fecha a aba/navegador e pede a senha
// de novo na próxima vez (não fica logado para sempre no aparelho).

(function () {
  const SESSION_KEY = 'circuito_admin_ok';
  const overlay = document.getElementById('login-overlay');
  const shell = document.getElementById('app-shell');
  const form = document.getElementById('form-login');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const logoutBtn = document.getElementById('btn-logout');

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, '1');
    overlay.style.display = 'none';
    shell.style.display = '';
  }

  function lock() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    unlock();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (passwordInput.value === ADMIN_PASSWORD) {
      errorEl.style.display = 'none';
      unlock();
    } else {
      errorEl.style.display = 'block';
      form.reset();
      passwordInput.focus();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      lock();
    });
  }
})();

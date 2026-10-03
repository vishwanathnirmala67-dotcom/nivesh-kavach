(function () {
  var t = null;
  try { t = localStorage.getItem('nk_theme'); } catch (e) {}
  if (t !== 'dark' && t !== 'light') t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  try { if (localStorage.getItem('nk_big') === '1') document.documentElement.classList.add('big'); } catch (e) {}
})();

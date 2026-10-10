(function () {
  function currentMode() {
    return ['#simulator', '#rubik-asli'].includes(window.location.hash) ? 'simulator' : 'belajar';
  }

  let activeMode = currentMode();
  document.documentElement.dataset.mode = activeMode;

  function updateMode() {
    const nextMode = currentMode();
    const changed = nextMode !== activeMode;
    activeMode = nextMode;
    document.documentElement.dataset.mode = nextMode;

    for (const link of document.querySelectorAll('[data-mode-link]')) {
      if (link.dataset.modeLink === nextMode) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    if (changed) requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }

  window.addEventListener('DOMContentLoaded', () => {
    updateMode();
    document.getElementById('back-to-top').addEventListener('click', event => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  window.addEventListener('load', () => {
    if (['#simulator', '#rubik-asli'].includes(window.location.hash)) window.scrollTo(0, 0);
  });
  window.addEventListener('hashchange', updateMode);
})();

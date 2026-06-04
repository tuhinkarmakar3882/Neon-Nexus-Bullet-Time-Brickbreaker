/** Back control for terms/privacy when embedded in the Next route (?embed=1), not in #html-shell. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const embedded = params.get('embed') === '1';

  function inGameLegalShell() {
    try {
      if (window.parent === window) return false;
      const frame = window.frameElement;
      return frame && frame.id === 'html-shell-frame';
    } catch {
      return false;
    }
  }

  function goBack() {
    if (window.parent !== window) {
      window.parent.postMessage({ neonShell: 'close' }, '*');
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = new URL('./', window.location.href).href;
  }

  if (embedded && !inGameLegalShell()) {
    document.body.classList.add('embed');
    const bar = document.createElement('header');
    bar.className = 'embed-bar';
    bar.innerHTML = '<button type="button" class="embed-back">← Back to game</button>';
    bar.querySelector('.embed-back').addEventListener('click', goBack);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') goBack();
  });
})();

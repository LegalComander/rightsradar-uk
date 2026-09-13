(() => {
  const head = document.head;

  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/manifest.webmanifest';
    head.appendChild(manifest);
  }

  if (!document.querySelector('meta[name="theme-color"]')) {
    const theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = '#070b12';
    head.appendChild(theme);
  }

  const appleCapable = document.createElement('meta');
  appleCapable.name = 'apple-mobile-web-app-capable';
  appleCapable.content = 'yes';
  if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) head.appendChild(appleCapable);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => {
        console.warn('RightsRadar service worker registration failed:', error);
      });
    });
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return;

  let deferredPrompt = null;
  let installButton = null;

  const style = document.createElement('style');
  style.textContent = `
    .rr-install-btn{display:none;align-items:center;justify-content:center;gap:8px;border:1px solid #3a5684;background:linear-gradient(135deg,#3b66ca,#2853ad);color:#fff;border-radius:14px;padding:13px 18px;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.3)}
    .rr-install-btn:hover{transform:translateY(-1px)}
    .rr-install-fallback{position:fixed;right:14px;bottom:14px;z-index:80;max-width:calc(100vw - 28px)}
    @media(max-width:560px){.rr-install-fallback{left:14px;right:14px;width:calc(100% - 28px)}}
  `;
  head.appendChild(style);

  const ensureButton = () => {
    if (installButton) return installButton;
    installButton = document.createElement('button');
    installButton.type = 'button';
    installButton.className = 'rr-install-btn';
    installButton.textContent = '📲 Install RightsRadar';
    installButton.setAttribute('aria-label', 'Install RightsRadar UK app');

    const heroActions = document.querySelector('.heroactions');
    if (heroActions) {
      heroActions.appendChild(installButton);
    } else {
      installButton.classList.add('rr-install-fallback');
      document.body.appendChild(installButton);
    }

    installButton.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (_) {}
        deferredPrompt = null;
        installButton.style.display = 'none';
        return;
      }

      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        alert('To install RightsRadar: tap Share in Safari, then choose “Add to Home Screen”.');
      } else {
        alert('To install RightsRadar: open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.');
      }
    });

    return installButton;
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    const button = ensureButton();
    button.style.display = 'inline-flex';
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installButton) installButton.style.display = 'none';
  });

  // If the browser does not emit beforeinstallprompt, still provide a clear manual install route.
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!isStandalone && !installButton) {
        const button = ensureButton();
        button.style.display = 'inline-flex';
      }
    }, 1600);
  });
})();

(() => {
  const head = document.head;
  const KEYS = {
    jurisdiction: 'rr.jurisdiction',
    jurisdictionDismissed: 'rr.jurisdictionDismissed',
    saved: 'rr.savedPages',
    textSize: 'rr.textSize',
    highContrast: 'rr.highContrast',
    reducedMotion: 'rr.reducedMotion'
  };

  const safeGet = (key, fallback = '') => {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  };
  const safeSet = (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  };
  const safeRemove = key => { try { localStorage.removeItem(key); } catch {} };
  const validJurisdictions = new Set(['scotland', 'england-wales', 'northern-ireland']);

  function ensureHead() {
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
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const appleCapable = document.createElement('meta');
      appleCapable.name = 'apple-mobile-web-app-capable';
      appleCapable.content = 'yes';
      head.appendChild(appleCapable);
    }
    if (!document.querySelector('link[href="/assets/pwa-experience.css"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = '/assets/pwa-experience.css';
      head.appendChild(css);
    }
  }

  ensureHead();

  let swRegistration = null;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => { swRegistration = reg; })
        .catch(error => console.warn('RightsRadar service worker registration failed:', error));
    });
  }

  function applyAccessibility() {
    const root = document.documentElement;
    root.classList.remove('rr-text-large', 'rr-text-xlarge', 'rr-high-contrast', 'rr-reduce-motion');
    const size = safeGet(KEYS.textSize, 'normal');
    if (size === 'large') root.classList.add('rr-text-large');
    if (size === 'xlarge') root.classList.add('rr-text-xlarge');
    if (safeGet(KEYS.highContrast) === '1') root.classList.add('rr-high-contrast');
    if (safeGet(KEYS.reducedMotion) === '1') root.classList.add('rr-reduce-motion');
  }
  applyAccessibility();

  function getSaved() {
    try {
      const parsed = JSON.parse(safeGet(KEYS.saved, '[]'));
      return Array.isArray(parsed) ? parsed.filter(x => x && x.url && x.title) : [];
    } catch { return []; }
  }
  function putSaved(items) { safeSet(KEYS.saved, JSON.stringify(items.slice(0, 100))); }
  function canonicalPath() {
    return location.pathname + location.search;
  }
  function isSaved(url = canonicalPath()) { return getSaved().some(x => x.url === url); }

  async function messageWorker(message) {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = swRegistration || await navigator.serviceWorker.ready;
      const worker = reg.active || reg.waiting || reg.installing;
      worker?.postMessage(message);
    } catch {}
  }

  function saveCurrentPage() {
    const url = canonicalPath();
    const items = getSaved().filter(x => x.url !== url);
    items.unshift({ url, title: document.title.replace(/\s*\|\s*RightsRadar UK\s*$/i, ''), savedAt: new Date().toISOString() });
    putSaved(items);
    messageWorker({ type: 'CACHE_PAGE', url });
    return true;
  }
  function removeSaved(url = canonicalPath()) {
    putSaved(getSaved().filter(x => x.url !== url));
    messageWorker({ type: 'REMOVE_PAGE', url });
  }

  const saveEligible = () => {
    const p = location.pathname;
    return p.startsWith('/guides/') || /\/(scotland-rights|england-wales-rights|northern-ireland-rights|protest-rights|new-laws)\.html$/.test(p);
  };

  function addSaveButton() {
    if (!saveEligible() || document.querySelector('.rr-save-page')) return;
    const h1 = document.querySelector('.prose h1, main h1');
    if (!h1) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rr-save-page';
    const refresh = () => {
      const saved = isSaved();
      button.classList.toggle('saved', saved);
      button.textContent = saved ? '✓ Saved offline' : '🔖 Save for later';
      button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    };
    button.addEventListener('click', () => {
      if (isSaved()) removeSaved(); else saveCurrentPage();
      refresh();
    });
    h1.insertAdjacentElement('afterend', button);
    refresh();
  }

  function setJurisdiction(value) {
    if (!validJurisdictions.has(value)) return;
    safeSet(KEYS.jurisdiction, value);
    safeSet(KEYS.jurisdictionDismissed, '1');
    const filter = document.querySelector('#regionFilter');
    if (filter) {
      const map = { 'scotland': 'scotland', 'england-wales': 'ew', 'northern-ireland': 'ni' };
      if ([...filter.options].some(o => o.value === map[value])) {
        filter.value = map[value];
        filter.dispatchEvent(new Event('change'));
      }
    }
    const quick = document.querySelector('#quickJurisdiction');
    if (quick) {
      quick.value = value;
      quick.dispatchEvent(new Event('change'));
    }
    document.dispatchEvent(new CustomEvent('rr:jurisdiction', { detail: value }));
  }

  function showJurisdictionBanner() {
    if (validJurisdictions.has(safeGet(KEYS.jurisdiction)) || safeGet(KEYS.jurisdictionDismissed) === '1') return;
    if (document.querySelector('.rr-jurisdiction-banner')) return;
    const box = document.createElement('div');
    box.className = 'rr-jurisdiction-banner';
    box.innerHTML = '<button class="rr-banner-dismiss" aria-label="Dismiss">✕</button><strong>Choose your legal system</strong><p>RightsRadar can prioritise the correct guides. This choice stays on this device.</p><div class="rr-choice-row"><button class="rr-chip" data-j="scotland">Scotland</button><button class="rr-chip" data-j="england-wales">England & Wales</button><button class="rr-chip" data-j="northern-ireland">Northern Ireland</button></div>';
    document.body.appendChild(box);
    box.querySelector('.rr-banner-dismiss').addEventListener('click', () => { safeSet(KEYS.jurisdictionDismissed, '1'); box.remove(); });
    box.querySelectorAll('[data-j]').forEach(btn => btn.addEventListener('click', () => { setJurisdiction(btn.dataset.j); box.remove(); }));
  }

  function quickHelpSetup() {
    const select = document.querySelector('#quickJurisdiction');
    const cards = [...document.querySelectorAll('[data-situation]')];
    if (!select || !cards.length) return;
    const routes = {
      scotland: {
        'stop-search': '/guides/stop-search-scotland.html',
        arrest: '/guides/custody-scotland.html',
        questioning: '/guides/answering-police-questions-scotland.html',
        court: '/guides/criminal-court-scotland.html',
        protest: '/guides/protest-rights-scotland.html',
        complaint: '/guides/complain-police-scotland.html'
      },
      'england-wales': {
        'stop-search': '/guides/stop-search-england-wales.html',
        arrest: '/guides/arrested-rights-england-wales.html',
        questioning: '/guides/police-questioning-england-wales.html',
        court: '/guides/magistrates-court-england-wales.html',
        protest: '/guides/protest-rights-england-wales.html',
        complaint: '/guides/complain-police-england-wales.html'
      },
      'northern-ireland': {
        'stop-search': '/guides/stop-search-northern-ireland.html',
        arrest: '/guides/custody-northern-ireland.html',
        questioning: '/guides/police-questioning-northern-ireland.html',
        court: '/guides/magistrates-court-northern-ireland.html',
        protest: '/guides/protest-rights-northern-ireland.html',
        complaint: '/guides/complain-police-northern-ireland.html'
      }
    };
    const update = () => {
      const j = validJurisdictions.has(select.value) ? select.value : 'scotland';
      cards.forEach(card => card.href = routes[j][card.dataset.situation] || '/');
      safeSet(KEYS.jurisdiction, j);
    };
    const stored = safeGet(KEYS.jurisdiction);
    if (validJurisdictions.has(stored)) select.value = stored;
    select.addEventListener('change', update);
    update();
  }

  function renderSavedPage() {
    const list = document.querySelector('#savedList');
    if (!list) return;
    const render = () => {
      const items = getSaved();
      list.textContent = '';
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'rr-empty';
        empty.textContent = 'Nothing saved yet. Open a legal guide and tap “Save for later”.';
        list.appendChild(empty);
        return;
      }
      items.forEach(item => {
        const card = document.createElement('section');
        card.className = 'rr-saved-item';
        const title = document.createElement('h2');
        title.textContent = item.title;
        const meta = document.createElement('p');
        const savedDate = item.savedAt ? new Date(item.savedAt) : null;
        meta.textContent = savedDate && !Number.isNaN(savedDate.getTime()) ? `Saved ${savedDate.toLocaleDateString('en-GB')}` : 'Saved on this device';
        const actions = document.createElement('div');
        actions.className = 'rr-saved-actions';
        const open = document.createElement('a');
        open.className = 'rr-primary';
        open.href = item.url;
        open.textContent = 'Open';
        const remove = document.createElement('button');
        remove.className = 'rr-secondary';
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.addEventListener('click', () => { removeSaved(item.url); render(); });
        actions.append(open, remove);
        card.append(title, meta, actions);
        list.appendChild(card);
      });
    };
    document.querySelector('#clearSaved')?.addEventListener('click', () => {
      if (!getSaved().length) return;
      if (!confirm('Remove all saved RightsRadar pages from this device?')) return;
      getSaved().forEach(item => messageWorker({ type: 'REMOVE_PAGE', url: item.url }));
      safeRemove(KEYS.saved);
      render();
    });
    render();
  }

  function createSettingsSheet() {
    if (document.querySelector('#rrSettingsSheet')) return document.querySelector('#rrSettingsSheet');
    const sheet = document.createElement('div');
    sheet.className = 'rr-appsheet';
    sheet.id = 'rrSettingsSheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'RightsRadar settings');
    sheet.innerHTML = `<div class="rr-sheet-card"><div class="rr-sheet-head"><h2>App settings</h2><button class="rr-sheet-close" type="button">Close</button></div>
      <div class="rr-setting"><strong>Legal system</strong><div class="rr-choice-row" data-setting="jurisdiction"><button class="rr-chip" data-value="scotland">Scotland</button><button class="rr-chip" data-value="england-wales">England & Wales</button><button class="rr-chip" data-value="northern-ireland">Northern Ireland</button></div><p class="rr-setting-note">Stored only on this device.</p></div>
      <div class="rr-setting"><strong>Text size</strong><div class="rr-choice-row" data-setting="text"><button class="rr-chip" data-value="normal">Normal</button><button class="rr-chip" data-value="large">Large</button><button class="rr-chip" data-value="xlarge">Extra large</button></div></div>
      <div class="rr-setting"><strong>Accessibility</strong><div class="rr-choice-row"><button class="rr-chip" id="rrContrast" type="button">High contrast</button><button class="rr-chip" id="rrMotion" type="button">Reduce motion</button><button class="rr-chip" id="rrRead" type="button">🔊 Read this page</button></div></div>
      <div class="rr-setting"><strong>Privacy</strong><p class="rr-setting-note">Jurisdiction, saved pages and accessibility choices stay in browser storage unless you separately use an account or Law Alerts feature.</p><a href="/privacy.html" class="rr-secondary" style="display:inline-flex;text-decoration:none">Privacy notice</a></div>
    </div>`;
    document.body.appendChild(sheet);
    const close = () => sheet.classList.remove('open');
    sheet.querySelector('.rr-sheet-close').addEventListener('click', close);
    sheet.addEventListener('click', e => { if (e.target === sheet) close(); });

    const refresh = () => {
      const j = safeGet(KEYS.jurisdiction);
      sheet.querySelectorAll('[data-setting="jurisdiction"] [data-value]').forEach(b => b.classList.toggle('active', b.dataset.value === j));
      const size = safeGet(KEYS.textSize, 'normal');
      sheet.querySelectorAll('[data-setting="text"] [data-value]').forEach(b => b.classList.toggle('active', b.dataset.value === size));
      sheet.querySelector('#rrContrast').classList.toggle('active', safeGet(KEYS.highContrast) === '1');
      sheet.querySelector('#rrMotion').classList.toggle('active', safeGet(KEYS.reducedMotion) === '1');
    };
    sheet.querySelectorAll('[data-setting="jurisdiction"] [data-value]').forEach(b => b.addEventListener('click', () => { setJurisdiction(b.dataset.value); refresh(); }));
    sheet.querySelectorAll('[data-setting="text"] [data-value]').forEach(b => b.addEventListener('click', () => { safeSet(KEYS.textSize, b.dataset.value); applyAccessibility(); refresh(); }));
    sheet.querySelector('#rrContrast').addEventListener('click', () => { safeSet(KEYS.highContrast, safeGet(KEYS.highContrast) === '1' ? '0' : '1'); applyAccessibility(); refresh(); });
    sheet.querySelector('#rrMotion').addEventListener('click', () => { safeSet(KEYS.reducedMotion, safeGet(KEYS.reducedMotion) === '1' ? '0' : '1'); applyAccessibility(); refresh(); });
    sheet.querySelector('#rrRead').addEventListener('click', () => {
      if (!('speechSynthesis' in window)) return alert('Read aloud is not supported by this browser.');
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
      const source = document.querySelector('.prose, main');
      const text = source?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 12000);
      if (!text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      speechSynthesis.speak(utterance);
    });
    sheet.refresh = refresh;
    return sheet;
  }

  function addAppBar() {
    if (document.querySelector('.rr-appbar')) return;
    const path = location.pathname;
    const nav = document.createElement('nav');
    nav.className = 'rr-appbar';
    nav.setAttribute('aria-label', 'RightsRadar app navigation');
    const items = [
      ['/', '🏠', 'Home', path === '/' || path === '/index.html'],
      ['/quick-help.html', '⚡', 'Help now', path === '/quick-help.html'],
      ['/new-laws.html', '📡', 'Radar', path === '/new-laws.html'],
      ['/saved.html', '🔖', 'Saved', path === '/saved.html']
    ];
    items.forEach(([href, icon, label, active]) => {
      const a = document.createElement('a');
      a.href = href;
      if (active) a.classList.add('active');
      a.innerHTML = `<span aria-hidden="true">${icon}</span>${label}`;
      nav.appendChild(a);
    });
    const settings = document.createElement('button');
    settings.type = 'button';
    settings.innerHTML = '<span aria-hidden="true">⚙️</span>Settings';
    settings.addEventListener('click', () => {
      const sheet = createSettingsSheet();
      sheet.refresh?.();
      sheet.classList.add('open');
    });
    nav.appendChild(settings);
    document.body.appendChild(nav);
    const mq = window.matchMedia('(max-width:760px), (display-mode:standalone)');
    const sync = () => document.body.classList.toggle('rr-has-appbar', mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
  }

  function applyStoredJurisdictionToHome() {
    const stored = safeGet(KEYS.jurisdiction);
    if (!validJurisdictions.has(stored)) return;
    const filter = document.querySelector('#regionFilter');
    if (!filter) return;
    const map = { 'scotland': 'scotland', 'england-wales': 'ew', 'northern-ireland': 'ni' };
    if ([...filter.options].some(o => o.value === map[stored])) {
      filter.value = map[stored];
      filter.dispatchEvent(new Event('change'));
    }
  }

  function addQuickHelpHeroButton() {
    const actions = document.querySelector('.heroactions');
    if (!actions || actions.querySelector('[href="/quick-help.html"]')) return;
    const a = document.createElement('a');
    a.href = '/quick-help.html';
    a.className = 'btn btn-secondary';
    a.textContent = '⚡ I need help now';
    actions.appendChild(a);
  }

  function setupInstall() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;
    let deferredPrompt = null;
    let installButton = null;
    const style = document.createElement('style');
    style.textContent = '.rr-install-btn{display:none;align-items:center;justify-content:center;gap:8px;border:1px solid #3a5684;background:linear-gradient(135deg,#3b66ca,#2853ad);color:#fff;border-radius:14px;padding:13px 18px;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.3)}.rr-install-btn:hover{transform:translateY(-1px)}.rr-install-fallback{position:fixed;right:14px;bottom:84px;z-index:65;max-width:calc(100vw - 28px)}@media(max-width:560px){.rr-install-fallback{left:14px;right:14px;width:calc(100% - 28px)}}';
    head.appendChild(style);
    const ensureButton = () => {
      if (installButton) return installButton;
      installButton = document.createElement('button');
      installButton.type = 'button';
      installButton.className = 'rr-install-btn';
      installButton.textContent = '📲 Install RightsRadar';
      installButton.setAttribute('aria-label', 'Install RightsRadar UK app');
      const heroActions = document.querySelector('.heroactions');
      if (heroActions) heroActions.appendChild(installButton);
      else { installButton.classList.add('rr-install-fallback'); document.body.appendChild(installButton); }
      installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          try { await deferredPrompt.userChoice; } catch {}
          deferredPrompt = null;
          installButton.style.display = 'none';
          return;
        }
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        alert(isIOS ? 'To install RightsRadar: tap Share in Safari, then choose “Add to Home Screen”.' : 'To install RightsRadar: open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.');
      });
      return installButton;
    };
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
      ensureButton().style.display = 'inline-flex';
    });
    window.addEventListener('appinstalled', () => { deferredPrompt = null; if (installButton) installButton.style.display = 'none'; });
    window.addEventListener('load', () => setTimeout(() => { if (!installButton) ensureButton().style.display = 'inline-flex'; }, 1600));
  }

  function init() {
    addAppBar();
    addSaveButton();
    quickHelpSetup();
    renderSavedPage();
    applyStoredJurisdictionToHome();
    addQuickHelpHeroButton();
    showJurisdictionBanner();
    setupInstall();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

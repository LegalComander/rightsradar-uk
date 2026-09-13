(() => {
  const SIMPLE_KEY = 'rr.simpleReading';

  const safeGet = key => {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  };
  const safeSet = (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  };

  function injectReadingStyles() {
    if (document.querySelector('#rrReadingStyles')) return;
    const style = document.createElement('style');
    style.id = 'rrReadingStyles';
    style.textContent = `
      html.rr-simple-reading .prose,
      html.rr-simple-reading main .content,
      html.rr-simple-reading .article .wrap {max-width:780px!important}
      html.rr-simple-reading .prose {line-height:1.82!important;letter-spacing:.01em}
      html.rr-simple-reading .prose p,
      html.rr-simple-reading .prose li {line-height:1.82!important}
      html.rr-simple-reading .prose p {margin-top:1rem;margin-bottom:1rem}
      html.rr-simple-reading .prose h2 {margin-top:2rem}
      html.rr-simple-reading .content {grid-template-columns:1fr!important}
      html.rr-simple-reading .sidebar {max-width:780px;margin-top:18px}
      html.rr-simple-reading .notice,
      html.rr-simple-reading .sourcebox {line-height:1.7}
      .rr-reading-state{font-size:.76rem;color:#9caabe;margin-top:7px}
    `;
    document.head.appendChild(style);
  }

  function applyReadingMode() {
    document.documentElement.classList.toggle('rr-simple-reading', safeGet(SIMPLE_KEY) === '1');
  }

  function augmentSettings(sheet) {
    if (!sheet || sheet.querySelector('#rrSimpleReading')) return;
    const privacy = [...sheet.querySelectorAll('.rr-setting')].find(el => (el.textContent || '').includes('Privacy'));
    const block = document.createElement('div');
    block.className = 'rr-setting';
    block.innerHTML = '<strong>Reading mode</strong><div class="rr-choice-row"><button class="rr-chip" id="rrSimpleReading" type="button">📖 Simplified reading</button></div><p class="rr-reading-state">Keeps the same legal information and sources, but narrows the page and increases spacing for easier reading. Stored only on this device.</p>';
    if (privacy) privacy.insertAdjacentElement('beforebegin', block); else sheet.querySelector('.rr-sheet-card')?.appendChild(block);
    const button = block.querySelector('#rrSimpleReading');
    const refresh = () => button.classList.toggle('active', safeGet(SIMPLE_KEY) === '1');
    button.addEventListener('click', () => {
      safeSet(SIMPLE_KEY, safeGet(SIMPLE_KEY) === '1' ? '0' : '1');
      applyReadingMode();
      refresh();
    });
    refresh();
  }

  function watchSettings() {
    const existing = document.querySelector('#rrSettingsSheet');
    if (existing) augmentSettings(existing);
    const observer = new MutationObserver(() => {
      const sheet = document.querySelector('#rrSettingsSheet');
      if (sheet) augmentSettings(sheet);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const sheet = document.querySelector('#rrSettingsSheet.open');
      if (sheet) sheet.classList.remove('open');
    });
  }

  function addDesktopButton() {
    if (document.querySelector('.rr-desktop-settings')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rr-desktop-settings';
    button.textContent = '⚙️ Settings';
    button.setAttribute('aria-label', 'Open RightsRadar settings');
    button.addEventListener('click', () => {
      const buttons = Array.from(document.querySelectorAll('.rr-appbar button'));
      const settingsButton = buttons.find(btn => (btn.textContent || '').includes('Settings'));
      if (settingsButton) settingsButton.click();
    });
    document.body.appendChild(button);
  }

  function init() {
    injectReadingStyles();
    applyReadingMode();
    addDesktopButton();
    watchSettings();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

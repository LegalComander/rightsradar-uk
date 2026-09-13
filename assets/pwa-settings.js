(() => {
  function init() {
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

(() => {
  if (!location.pathname.startsWith('/guides/')) return;

  function init() {
    const article = document.querySelector('.prose');
    const heading = article?.querySelector('h1');
    const sourceBox = article?.querySelector('.sourcebox');
    if (!article || !heading || !sourceBox || document.querySelector('.rr-trust-panel')) return;

    const pills = [...article.querySelectorAll('.meta .pill')].map(el => (el.textContent || '').trim()).filter(Boolean);
    const jurisdiction = pills.find(text => /Scotland|England\s*&\s*Wales|Northern Ireland|UK-wide|United Kingdom/i.test(text)) || 'Check the jurisdiction shown on this guide';
    const checked = pills.find(text => /last checked/i.test(text)) || 'Review date shown on page';
    const sourceLinks = [...sourceBox.querySelectorAll('a[href^="http"]')];

    const style = document.createElement('style');
    style.textContent = `
      .rr-trust-panel{margin:14px 0 20px;padding:14px 15px;border:1px solid #2d614f;border-radius:14px;background:linear-gradient(135deg,#0e231d,#0d1b24);color:#dcefe7}
      .rr-trust-head{display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-weight:900}.rr-trust-badge{display:inline-flex;align-items:center;gap:6px;border:1px solid #34755e;background:#123126;color:#9ae2c4;border-radius:999px;padding:5px 9px;font-size:.75rem}
      .rr-trust-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:11px}.rr-trust-item{border:1px solid #263d42;border-radius:10px;padding:9px 10px;background:rgba(5,13,18,.35)}.rr-trust-item span{display:block;color:#86a79b;font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.rr-trust-item strong{display:block;margin-top:3px;font-size:.82rem;color:#eef8f4}
      .rr-trust-note{margin:10px 0 0;color:#9bb5ad;font-size:.76rem}@media(max-width:680px){.rr-trust-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('section');
    panel.className = 'rr-trust-panel';
    panel.setAttribute('aria-label', 'Guide verification details');
    panel.innerHTML = `
      <div class="rr-trust-head"><span class="rr-trust-badge">✓ RightsRadar verified guide</span><span>Source transparency</span></div>
      <div class="rr-trust-grid">
        <div class="rr-trust-item"><span>Jurisdiction</span><strong></strong></div>
        <div class="rr-trust-item"><span>Review</span><strong></strong></div>
        <div class="rr-trust-item"><span>Official sources</span><strong>${sourceLinks.length} linked</strong></div>
      </div>
      <p class="rr-trust-note">This panel summarises information already shown on the guide. Open the official source links for the latest legal wording and commencement details.</p>`;
    const strongs = panel.querySelectorAll('.rr-trust-item strong');
    strongs[0].textContent = jurisdiction.replace(/^🏴\s*/, '');
    strongs[1].textContent = checked.replace(/^Last checked:\s*/i, 'Last checked ');

    const saveButton = heading.nextElementSibling?.classList?.contains('rr-save-page') ? heading.nextElementSibling : null;
    (saveButton || heading).insertAdjacentElement('afterend', panel);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

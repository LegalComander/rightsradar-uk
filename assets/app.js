const menu=document.querySelector('.menu'); const nav=document.querySelector('.navlinks');
if(menu&&nav)menu.addEventListener('click',()=>nav.classList.toggle('open'));

const guideGrid=document.querySelector('#guideGrid');
if(guideGrid){
  const englandWalesExtras=`
    <a class="card" data-search="england wales police questioning interview caution silence answer questions solicitor legal advice" data-region="ew" href="guides/police-questioning-england-wales.html"><div class="icon">🗣️</div><h3>Police questioning &amp; the caution</h3><p>What the caution means, how silence can matter, and why legal advice is important.</p><span class="tag">England &amp; Wales · verified</span></a>
    <a class="card" data-search="england wales fingerprints dna photographs samples mouth swab police database biometrics" data-region="ew" href="guides/fingerprints-dna-england-wales.html"><div class="icon">🧬</div><h3>Fingerprints, photographs &amp; DNA</h3><p>What police can take without permission and the different rules for some intimate samples.</p><span class="tag">England &amp; Wales · verified</span></a>
    <a class="card" data-search="england wales complain police complaint iopc professional standards review appeal misconduct" data-region="ew" href="guides/complain-police-england-wales.html"><div class="icon">📣</div><h3>Complain about the police</h3><p>How police complaints work, what the IOPC does, and when a review may be available.</p><span class="tag">England &amp; Wales · verified</span></a>
    <a class="card" data-search="england wales under 18 child juvenile vulnerable adult police custody appropriate adult solicitor safeguards" data-region="ew" href="guides/young-vulnerable-custody-england-wales.html"><div class="icon">🛡️</div><h3>Young &amp; vulnerable people in custody</h3><p>Appropriate adults, legal advice and extra safeguards for children and vulnerable people.</p><span class="tag">England &amp; Wales · verified</span></a>`;
  const firstScotlandCard=guideGrid.querySelector('[data-region="scotland"]');
  if(firstScotlandCard) firstScotlandCard.insertAdjacentHTML('beforebegin',englandWalesExtras);
  else guideGrid.insertAdjacentHTML('beforeend',englandWalesExtras);
}

const q=document.querySelector('#siteSearch'); const region=document.querySelector('#regionFilter'); const cards=[...document.querySelectorAll('[data-search]')]; const empty=document.querySelector('#emptySearch');
function filter(){if(!q)return;const term=q.value.toLowerCase().trim();const reg=region?.value||'all';let shown=0;cards.forEach(c=>{const okText=!term||c.dataset.search.toLowerCase().includes(term);const okReg=reg==='all'||c.dataset.region===reg||c.dataset.region==='uk';const ok=okText&&okReg;c.style.display=ok?'block':'none';if(ok)shown++});if(empty)empty.style.display=shown?'none':'block'}
q?.addEventListener('input',filter);region?.addEventListener('change',filter);
const form=document.querySelector('#alertForm');
form?.addEventListener('submit',e=>{e.preventDefault();const email=form.querySelector('input[type=email]').value;const area=form.querySelector('select').value;localStorage.setItem('kyruk_alert_demo',JSON.stringify({email,area}));const s=document.querySelector('#alertStatus');s.style.display='block';s.textContent='Saved on this device for the demo. Email delivery will be connected in the accounts phase.'});

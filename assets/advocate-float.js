(()=>{
  if(document.getElementById('rrAdvocateDock'))return;
  const nested=location.pathname.includes('/guides/');
  const root=nested?'../':'';
  const dock=document.createElement('div');
  dock.id='rrAdvocateDock';
  dock.className='rr-advocate-dock';
  dock.innerHTML=`<button class="rr-advocate-launch" type="button" aria-expanded="false" aria-controls="rrAdvocatePanel"><span class="rr-advocate-orb"><img src="${root}assets/advocate.svg" alt=""></span><span class="rr-advocate-launch-copy"><strong>Ask Advocate</strong><small>Verified UK rights information</small></span><span class="rr-advocate-pulse" aria-hidden="true"></span></button><section id="rrAdvocatePanel" class="rr-advocate-panel" hidden aria-label="RightsRadar Advocate"><header><div class="rr-advocate-title"><span class="rr-advocate-mini"><img src="${root}assets/advocate.svg" alt=""></span><div><strong>RightsRadar Advocate</strong><small>AI legal-information assistant</small></div></div><button class="rr-advocate-close" type="button" aria-label="Close Advocate">×</button></header><div class="rr-advocate-body"><span class="rr-advocate-badge">● VERIFIED-SOURCE ASSISTANT</span><h2>What happened?</h2><p>Tell me in your own words and in any language. I’ll help you find relevant RightsRadar information and official sources.</p><div class="rr-advocate-chips"><button type="button" data-q="I was stopped and searched by police">Stop & search</button><button type="button" data-q="I have been arrested. What are my rights?">Arrested</button><button type="button" data-q="What are my protest rights?">Protest rights</button></div><label for="rrAdvocateQuestion">Your question</label><textarea id="rrAdvocateQuestion" maxlength="600" placeholder="Example: Police stopped me and searched my bag. What are my rights?"></textarea><label for="rrAdvocateJurisdiction">Where in the UK?</label><select id="rrAdvocateJurisdiction"><option value="scotland">Scotland</option><option value="england-wales">England & Wales</option><option value="northern-ireland">Northern Ireland</option></select><button class="rr-advocate-go" type="button">Continue with Advocate →</button><p class="rr-advocate-note">Legal information, not legal advice. For emergencies use the appropriate emergency service.</p></div></section>`;
  document.body.appendChild(dock);
  const launch=dock.querySelector('.rr-advocate-launch'),panel=dock.querySelector('.rr-advocate-panel'),close=dock.querySelector('.rr-advocate-close'),question=dock.querySelector('#rrAdvocateQuestion'),jur=dock.querySelector('#rrAdvocateJurisdiction'),go=dock.querySelector('.rr-advocate-go');
  try{const saved=localStorage.getItem('rr.jurisdiction');if(['scotland','england-wales','northern-ireland'].includes(saved))jur.value=saved}catch{}
  const setOpen=open=>{panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));dock.classList.toggle('open',open);if(open)setTimeout(()=>question.focus(),80)};
  launch.addEventListener('click',()=>setOpen(panel.hidden));close.addEventListener('click',()=>setOpen(false));
  dock.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{question.value=b.dataset.q;question.focus()}));
  jur.addEventListener('change',()=>{try{localStorage.setItem('rr.jurisdiction',jur.value)}catch{}});
  const proceed=()=>{const q=question.value.trim();const url=new URL(root+'ask.html',location.href);if(q)url.searchParams.set('q',q);url.searchParams.set('jurisdiction',jur.value);location.href=url.href};
  go.addEventListener('click',proceed);question.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')proceed()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)setOpen(false)});
})();

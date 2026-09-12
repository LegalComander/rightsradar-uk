const menu=document.querySelector('.menu');
const nav=document.querySelector('.navlinks');
if(menu&&nav) menu.addEventListener('click',()=>nav.classList.toggle('open'));

const guideGrid=document.querySelector('#guideGrid');
const dynamicGuides=[
  // England & Wales — additional police/custody guides
  ['ew','guides/arrest-powers-england-wales.html','👮','When can police arrest me?','Reasonable suspicion, necessity and what police must tell you.','england wales police arrest powers reasonable suspicion necessity pace code g'],
  ['ew','guides/police-questioning-england-wales.html','🗣️','Police questioning & the caution','What the caution means, how silence can matter and why legal advice is important.','england wales police questioning interview caution silence solicitor legal advice'],
  ['ew','guides/custody-contact-england-wales.html','📞','Tell someone I am in custody','Your right to have someone told where you are.','england wales police custody contact family friend tell someone informed'],
  ['ew','guides/appropriate-adult-england-wales.html','🤝','What is an Appropriate Adult?','Support for children and vulnerable people during police procedures.','england wales appropriate adult child vulnerable police custody support'],
  ['ew','guides/young-vulnerable-custody-england-wales.html','🛡️','Young & vulnerable people in custody','Extra safeguards for under-18s and vulnerable adults.','england wales under 18 child juvenile vulnerable adult police custody safeguards'],
  ['ew','guides/medical-interpreter-custody-england-wales.html','🩺','Medical help & interpreters','Healthcare, language and communication support in custody.','england wales custody medical doctor interpreter communication language support'],
  ['ew','guides/fingerprints-dna-england-wales.html','🧬','Fingerprints, photographs & DNA','Police powers over identification and biometric samples.','england wales fingerprints dna photographs samples biometrics police'],
  ['ew','guides/stop-search-record-england-wales.html','🗂️','Get a stop-and-search record','How to obtain a copy after a police search.','england wales stop search record copy three months police'],
  ['ew','guides/complain-police-england-wales.html','📣','Complain about the police','Police complaints, reviews and the IOPC.','england wales complain police complaint iopc professional standards review misconduct'],
  // England & Wales — court
  ['ew','guides/charged-crime-england-wales.html','📄','Charged with a crime','Charge sheets, release or custody, and the first court hearing.','england wales charged crime charge sheet court first hearing'],
  ['ew','guides/bail-england-wales.html','🔓','Bail after charge','Police bail, court bail, conditions and remand.','england wales bail police court conditions remand custody'],
  ['ew','guides/magistrates-court-england-wales.html','🏛️','Magistrates’ Court','Where criminal cases start and which cases move to Crown Court.','england wales magistrates court criminal case summary either way'],
  ['ew','guides/crown-court-england-wales.html','⚖️','Crown Court','Serious criminal cases, judge and jury roles, sentencing and appeals.','england wales crown court judge jury serious crime appeal sentence trial'],
  ['ew','guides/pleas-england-wales.html','🗣️','Guilty or not guilty plea','What each plea means and what normally happens next.','england wales guilty not guilty plea trial sentence criminal court'],
  ['ew','guides/criminal-legal-aid-england-wales.html','💷','Criminal legal aid','Court eligibility and how a solicitor applies for legal aid.','england wales criminal legal aid solicitor court duty solicitor means interests justice'],
  // England & Wales — protest/public order
  ['ew','guides/protest-rights-england-wales.html','📢','Protest rights & police powers','Conditions, serious disruption, searches and public-order powers.','england wales protest demonstration march public order police conditions serious disruption'],
  ['ew','guides/protest-face-coverings-england-wales.html','🥷','Masks & balaclavas at protests','The 2026 designated-area identity-concealment offence and exceptions.','england wales protest mask masks balaclava balaclavas face covering conceal identity designated area'],
  ['ew','guides/protest-locking-on-england-wales.html','🔗','Locking-on & disruptive tactics','Locking-on, tunnelling, infrastructure offences and protest stop/search.','england wales protest locking on glue tunnel tunnelling infrastructure stop search public order act 2023'],
  ['ew','guides/protest-new-offences-2026-england-wales.html','🆕','New protest laws in 2026','Pyrotechnics, memorials, homes, places of worship and cumulative disruption.','england wales protest 2026 flares fireworks pyrotechnics memorials homes place worship cumulative disruption'],
  // Northern Ireland
  ['ni','guides/stop-search-northern-ireland.html','🔎','Stopped & searched by PSNI','When stop-and-search powers can be used and the safeguards that apply.','northern ireland psni police stop search reasonable grounds rights'],
  ['ni','guides/stop-search-record-northern-ireland.html','🗂️','Get a stop-and-search record','How to request a copy of your PSNI stop-and-search record.','northern ireland psni stop search record copy'],
  ['ni','guides/arrest-powers-northern-ireland.html','👮','When can police arrest me?','The PACE NI arrest framework and what happens after arrest.','northern ireland psni police arrest powers pace code g'],
  ['ni','guides/custody-northern-ireland.html','🚓','Police custody rights','Your main rights and safeguards while detained by police.','northern ireland psni police custody rights detained solicitor medical'],
  ['ni','guides/legal-advice-police-station-northern-ireland.html','⚖️','Legal advice at the police station','Private, independent legal advice while in custody.','northern ireland police station legal advice solicitor pace'],
  ['ni','guides/police-questioning-northern-ireland.html','🗣️','Police questioning & interviews','Interview safeguards, recording and access to legal advice.','northern ireland police questioning interview pace solicitor'],
  ['ni','guides/custody-time-northern-ireland.html','⏱️','How long can police hold me?','The ordinary detention framework and rules for longer detention.','northern ireland police custody time detention limit pace'],
  ['ni','guides/custody-contact-northern-ireland.html','📞','Tell someone I am in custody','Having someone informed and communication during detention.','northern ireland custody contact family friend informed arrest phone'],
  ['ni','guides/appropriate-adult-northern-ireland.html','🤝','What is an Appropriate Adult?','Support and safeguarding for children and vulnerable adults.','northern ireland appropriate adult child vulnerable police custody'],
  ['ni','guides/young-vulnerable-custody-northern-ireland.html','🛡️','Young & vulnerable people in custody','Extra safeguards during interviews and custody procedures.','northern ireland young vulnerable child police custody safeguards'],
  ['ni','guides/medical-interpreter-custody-northern-ireland.html','🩺','Medical help & interpreters','Healthcare and communication support while in custody.','northern ireland custody medical doctor nurse interpreter communication'],
  ['ni','guides/fingerprints-dna-northern-ireland.html','🧬','Fingerprints, photographs & DNA','Identification procedures and biometric material under PACE NI.','northern ireland fingerprints dna photographs biometric samples police'],
  ['ni','guides/complain-police-northern-ireland.html','📣','Complain about police','How the independent Police Ombudsman complaints system works.','northern ireland police complaint ombudsman misconduct excessive force'],
  ['ni','guides/charged-crime-northern-ireland.html','📄','Charged with a crime','What happens after charge and before the first court appearance.','northern ireland charged crime pps prosecution court charge'],
  ['ni','guides/bail-northern-ireland.html','🔓','Bail after charge','Bail decisions, conditions, risks and remand.','northern ireland bail court conditions remand custody pps'],
  ['ni','guides/magistrates-court-northern-ireland.html','🏛️','Magistrates’ Court','Summary cases and the route of more serious cases.','northern ireland magistrates court district judge criminal summary'],
  ['ni','guides/crown-court-northern-ireland.html','⚖️','Crown Court','Indictable offences, trials and criminal appeals.','northern ireland crown court indictable judge jury serious crime appeal'],
  ['ni','guides/criminal-plea-northern-ireland.html','🗣️','Guilty or not guilty plea','What each plea means and what normally happens next.','northern ireland guilty not guilty plea sentence trial pps'],
  ['ni','guides/criminal-legal-aid-northern-ireland.html','💷','Criminal legal aid','Police-station advice and court legal-aid eligibility.','northern ireland criminal legal aid solicitor magistrates crown court'],
  ['ni','guides/protest-rights-northern-ireland.html','📢','Protest rights & processions','PSNI guidance, processions, parade-related protests and notification rules.','northern ireland protest public procession parade parades commission demonstration psni'],
  // Scotland — new protest guide
  ['scotland','guides/protest-rights-scotland.html','📢','Protest rights, marches & demonstrations','Notification, police conditions and static demonstrations in Scotland.','scotland protest march parade demonstration police conditions public procession'],
  // UK navigator
  ['uk','protest-rights.html','📣','UK protest rights hub','Compare protest rules across Scotland, England & Wales and Northern Ireland.','uk protest rights demonstrations marches masks balaclavas public order']
];

function cardHtml([region,href,icon,title,desc,search]){
  const label=region==='ew'?'England & Wales':region==='ni'?'Northern Ireland':region==='scotland'?'Scotland':'UK';
  const cls=region==='scotland'?'tag scotland':'tag';
  return `<a class="card" data-search="${search}" data-region="${region}" href="${href}"><div class="icon">${icon}</div><h3>${title}</h3><p>${desc}</p><span class="${cls}">${label} · verified</span></a>`;
}

if(guideGrid){
  const existingHrefs=new Set([...guideGrid.querySelectorAll('a.card')].map(a=>a.getAttribute('href')));
  const fresh=dynamicGuides.filter(g=>!existingHrefs.has(g[1]));
  const firstScotland=guideGrid.querySelector('[data-region="scotland"]');
  const html=fresh.map(cardHtml).join('');
  if(firstScotland) firstScotland.insertAdjacentHTML('beforebegin',html);
  else guideGrid.insertAdjacentHTML('beforeend',html);

  const jurisdictions=[...document.querySelectorAll('#regions .jurisdiction')];
  const setRegionLink=(name,href,text)=>{
    const box=jurisdictions.find(x=>x.querySelector('h3')?.textContent.includes(name));
    const a=box?.querySelector('a');
    if(a){a.href=href;a.textContent=text;}
  };
  setRegionLink('Scotland','scotland-rights.html','Browse Scotland →');
  setRegionLink('England & Wales','england-wales-rights.html','Browse England & Wales →');
  setRegionLink('Northern Ireland','northern-ireland-rights.html','Browse Northern Ireland →');

  const lead=document.querySelector('#rights .lead');
  if(lead) lead.textContent='Verified rights libraries are live for Scotland, England & Wales and Northern Ireland, including dedicated protest and public-order guides.';
  const note=document.querySelector('.searchnote');
  if(note) note.textContent='Search verified guides across all three UK legal systems.';
}

if(nav&&!nav.querySelector('a[href$="protest-rights.html"]')){
  const about=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')?.includes('about.html'));
  const protest=document.createElement('a');
  const nested=location.pathname.includes('/guides/');
  protest.href=nested?'../protest-rights.html':'protest-rights.html';
  protest.textContent='Protest rights';
  if(about) about.before(protest); else nav.appendChild(protest);
}

if(nav&&!nav.querySelector('a[href$="alerts.html"]')){
  const about=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')?.includes('about.html'));
  const alerts=document.createElement('a');
  const nested=location.pathname.includes('/guides/');
  alerts.href=nested?'../alerts.html':'alerts.html';
  alerts.textContent='Law alerts';
  if(about) about.before(alerts); else nav.appendChild(alerts);
}

if(nav&&!nav.querySelector('a[href$="community.html"]')){
  const about=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')?.includes('about.html'));
  const community=document.createElement('a');
  const nested=location.pathname.includes('/guides/');
  community.href=nested?'../community.html':'community.html';
  community.textContent='Community';
  if(about) about.before(community); else nav.appendChild(community);
}

const q=document.querySelector('#siteSearch');
const region=document.querySelector('#regionFilter');
const cards=[...document.querySelectorAll('[data-search]')];
const empty=document.querySelector('#emptySearch');
function filter(){
  if(!q)return;
  const term=q.value.toLowerCase().trim();
  const reg=region?.value||'all';
  let shown=0;
  cards.forEach(c=>{
    const okText=!term||c.dataset.search.toLowerCase().includes(term);
    const okReg=reg==='all'||c.dataset.region===reg||c.dataset.region==='uk';
    const ok=okText&&okReg;
    c.style.display=ok?'block':'none';
    if(ok)shown++;
  });
  if(empty) empty.style.display=shown?'none':'block';
}
q?.addEventListener('input',filter);
region?.addEventListener('change',filter);

const form=document.querySelector('#alertForm');
if(form){
  const alertBox=form.closest('.alertbox');
  const badge=alertBox?.querySelector('.eyebrow');
  const small=alertBox?.querySelector('.small');
  const heading=form.querySelector('h3');
  const button=form.querySelector('button[type="submit"]');
  if(badge) badge.textContent='🔔 Law Alerts beta';
  if(small) small.textContent='Choose your jurisdiction and legal topics on the Law Alerts page. Beta registration is free.';
  if(heading) heading.textContent='Set up law alerts';
  if(button) button.textContent='Choose topics & register';
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const email=form.querySelector('input[type=email]')?.value||'';
    const rawArea=form.querySelector('select')?.value||'scotland';
    const map={ew:'england-wales',england:'england-wales','england-wales':'england-wales',ni:'northern-ireland','northern-ireland':'northern-ireland',scotland:'scotland',uk:'uk-wide','uk-wide':'uk-wide'};
    const area=map[rawArea]||'scotland';
    location.href=`alerts.html?email=${encodeURIComponent(email)}&jurisdiction=${encodeURIComponent(area)}`;
  });
}

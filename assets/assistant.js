(() => {
  const CATALOG = [
    {j:'scotland',url:'/guides/stop-search-scotland.html',title:'Stopped and searched by police in Scotland',k:'stop search searched police bag pockets clothes suspicion reason power record street'},
    {j:'scotland',url:'/guides/stop-search-record-scotland.html',title:'Get a stop-and-search record in Scotland',k:'stop search record copy paperwork request six months'},
    {j:'scotland',url:'/guides/arrest-powers-scotland.html',title:'Police arrest powers in Scotland',k:'arrest arrested police power warrant reasonable grounds tell reason'},
    {j:'scotland',url:'/guides/custody-scotland.html',title:'Arrested or held in custody in Scotland',k:'arrest custody detained police station solicitor lawyer interview rights detention'},
    {j:'scotland',url:'/guides/custody-time-scotland.html',title:'How long can police hold me in Scotland?',k:'custody detention time hours 12 24 extension hold police station'},
    {j:'scotland',url:'/guides/custody-contact-scotland.html',title:'Tell someone you are in custody in Scotland',k:'custody phone call family friend partner tell someone contact'},
    {j:'scotland',url:'/guides/answering-police-questions-scotland.html',title:'Answering police questions in Scotland',k:'questions questioning interview silence answer name address solicitor lawyer caution'},
    {j:'scotland',url:'/guides/appropriate-adult-scotland.html',title:'Appropriate Adult support in Scotland',k:'appropriate adult vulnerable disability communication support custody'},
    {j:'scotland',url:'/guides/medical-interpreter-custody-scotland.html',title:'Medical help and interpreters in Scottish custody',k:'doctor medical medication interpreter language disability health custody'},
    {j:'scotland',url:'/guides/young-vulnerable-custody-scotland.html',title:'Young and vulnerable people in Scottish custody',k:'young child under 18 vulnerable parent guardian custody solicitor'},
    {j:'scotland',url:'/guides/fingerprints-dna-scotland.html',title:'Fingerprints, photographs and DNA in Scotland',k:'fingerprints dna photograph sample forensic police arrest'},
    {j:'scotland',url:'/guides/charged-crime-scotland.html',title:'Charged with a crime in Scotland',k:'charged charge crime procurator fiscal release court police'},
    {j:'scotland',url:'/guides/undertaking-scotland.html',title:'Police undertakings in Scotland',k:'undertaking conditions release charged court police conditions'},
    {j:'scotland',url:'/guides/investigative-liberation-scotland.html',title:'Investigative liberation in Scotland',k:'investigative liberation release conditions sheriff appeal police'},
    {j:'scotland',url:'/guides/criminal-court-scotland.html',title:'Going to criminal court in Scotland',k:'court sheriff high court trial summary solemn criminal hearing'},
    {j:'scotland',url:'/guides/criminal-plea-scotland.html',title:'Guilty or not guilty pleas in Scotland',k:'plea guilty not guilty trial court diet criminal'},
    {j:'scotland',url:'/guides/criminal-legal-aid-scotland.html',title:'Criminal legal aid in Scotland',k:'legal aid solicitor lawyer cost money court criminal'},
    {j:'scotland',url:'/guides/complain-police-scotland.html',title:'Complaining about Police Scotland',k:'complaint complain police pirc misconduct officer review'},
    {j:'scotland',url:'/guides/protest-rights-scotland.html',title:'Protest rights in Scotland',k:'protest march demonstration police public order conditions arrest'},

    {j:'england-wales',url:'/guides/stop-search-england-wales.html',title:'Stop and search in England & Wales',k:'stop search searched police bag pockets clothes suspicion grounds reason power pace'},
    {j:'england-wales',url:'/guides/stop-search-record-england-wales.html',title:'Get a stop-and-search record in England & Wales',k:'stop search record copy paperwork request police'},
    {j:'england-wales',url:'/guides/arrest-powers-england-wales.html',title:'Police arrest powers in England & Wales',k:'arrest arrested police necessity reasonable suspicion grounds warrant tell reason'},
    {j:'england-wales',url:'/guides/arrested-rights-england-wales.html',title:'Arrested: your rights in England & Wales',k:'arrest arrested custody detained police station rights solicitor legal advice'},
    {j:'england-wales',url:'/guides/legal-advice-police-station-england-wales.html',title:'Free legal advice at the police station',k:'solicitor lawyer legal advice free duty solicitor police station interview'},
    {j:'england-wales',url:'/guides/police-questioning-england-wales.html',title:'Police questioning in England & Wales',k:'questions questioning interview caution silence answer solicitor lawyer'},
    {j:'england-wales',url:'/guides/custody-time-england-wales.html',title:'Police custody time limits in England & Wales',k:'custody detention time hours 24 36 96 hold police station bail'},
    {j:'england-wales',url:'/guides/custody-contact-england-wales.html',title:'Telling someone you are in custody in England & Wales',k:'custody phone call family friend partner tell someone contact'},
    {j:'england-wales',url:'/guides/appropriate-adult-england-wales.html',title:'Appropriate Adult support in England & Wales',k:'appropriate adult vulnerable disability communication under 18 custody'},
    {j:'england-wales',url:'/guides/medical-interpreter-custody-england-wales.html',title:'Medical help and interpreters in custody',k:'doctor medical medication interpreter language health disability custody'},
    {j:'england-wales',url:'/guides/young-vulnerable-custody-england-wales.html',title:'Young and vulnerable people in custody',k:'young child under 18 vulnerable parent guardian appropriate adult custody'},
    {j:'england-wales',url:'/guides/fingerprints-dna-england-wales.html',title:'Fingerprints and DNA in England & Wales',k:'fingerprints dna photograph sample forensic arrest police'},
    {j:'england-wales',url:'/guides/charged-crime-england-wales.html',title:'Charged with a crime in England & Wales',k:'charged charge crime police bail court prosecution'},
    {j:'england-wales',url:'/guides/bail-england-wales.html',title:'Police and court bail in England & Wales',k:'bail conditions release police court return station investigation'},
    {j:'england-wales',url:'/guides/magistrates-court-england-wales.html',title:'Magistrates’ Court in England & Wales',k:'magistrates court hearing trial plea criminal charged'},
    {j:'england-wales',url:'/guides/crown-court-england-wales.html',title:'Crown Court in England & Wales',k:'crown court jury trial sentence indictment serious offence'},
    {j:'england-wales',url:'/guides/pleas-england-wales.html',title:'Guilty and not guilty pleas in England & Wales',k:'plea guilty not guilty court trial criminal'},
    {j:'england-wales',url:'/guides/criminal-legal-aid-england-wales.html',title:'Criminal legal aid in England & Wales',k:'legal aid solicitor lawyer cost money means interests justice'},
    {j:'england-wales',url:'/guides/complain-police-england-wales.html',title:'Complaining about police in England & Wales',k:'complaint complain police iopc misconduct officer force'},
    {j:'england-wales',url:'/guides/protest-rights-england-wales.html',title:'Protest rights in England & Wales',k:'protest march demonstration police public order conditions arrest'},
    {j:'england-wales',url:'/guides/protest-face-coverings-england-wales.html',title:'Face coverings at protests in England & Wales',k:'protest face covering mask balaclava conceal identity remove covering police'},
    {j:'england-wales',url:'/guides/protest-locking-on-england-wales.html',title:'Locking on at protests in England & Wales',k:'protest locking on glue chain attach object offence public order'},
    {j:'england-wales',url:'/guides/protest-new-offences-2026-england-wales.html',title:'New protest offences and powers in England & Wales',k:'protest new offences 2026 police powers public order conditions'},

    {j:'northern-ireland',url:'/guides/stop-search-northern-ireland.html',title:'Stop and search in Northern Ireland',k:'stop search searched psni police bag clothes suspicion grounds power'},
    {j:'northern-ireland',url:'/guides/stop-search-record-northern-ireland.html',title:'Stop-and-search records in Northern Ireland',k:'stop search record copy psni police'},
    {j:'northern-ireland',url:'/guides/arrest-powers-northern-ireland.html',title:'Police arrest powers in Northern Ireland',k:'arrest arrested psni police grounds warrant reason'},
    {j:'northern-ireland',url:'/guides/custody-northern-ireland.html',title:'Police custody in Northern Ireland',k:'arrest custody detained police psni station rights solicitor'},
    {j:'northern-ireland',url:'/guides/custody-time-northern-ireland.html',title:'Custody time limits in Northern Ireland',k:'custody detention time hours hold psni police station'},
    {j:'northern-ireland',url:'/guides/custody-contact-northern-ireland.html',title:'Telling someone you are in custody in Northern Ireland',k:'custody contact family friend phone call psni'},
    {j:'northern-ireland',url:'/guides/legal-advice-police-station-northern-ireland.html',title:'Legal advice at a police station in Northern Ireland',k:'solicitor lawyer legal advice police psni station interview'},
    {j:'northern-ireland',url:'/guides/police-questioning-northern-ireland.html',title:'Police questioning in Northern Ireland',k:'questions questioning interview caution silence solicitor psni'},
    {j:'northern-ireland',url:'/guides/appropriate-adult-northern-ireland.html',title:'Appropriate Adult support in Northern Ireland',k:'appropriate adult vulnerable disability communication custody psni'},
    {j:'northern-ireland',url:'/guides/medical-interpreter-custody-northern-ireland.html',title:'Medical and interpreter support in Northern Ireland custody',k:'medical doctor medication interpreter language disability custody psni'},
    {j:'northern-ireland',url:'/guides/young-vulnerable-custody-northern-ireland.html',title:'Young and vulnerable people in Northern Ireland custody',k:'young under 18 vulnerable parent guardian custody psni'},
    {j:'northern-ireland',url:'/guides/fingerprints-dna-northern-ireland.html',title:'Fingerprints and DNA in Northern Ireland',k:'fingerprints dna photograph samples forensic psni arrest'},
    {j:'northern-ireland',url:'/guides/charged-crime-northern-ireland.html',title:'Charged with a crime in Northern Ireland',k:'charged charge crime court prosecution psni'},
    {j:'northern-ireland',url:'/guides/bail-northern-ireland.html',title:'Bail in Northern Ireland',k:'bail release conditions court police psni'},
    {j:'northern-ireland',url:'/guides/magistrates-court-northern-ireland.html',title:'Magistrates’ Court in Northern Ireland',k:'magistrates court criminal hearing trial plea'},
    {j:'northern-ireland',url:'/guides/crown-court-northern-ireland.html',title:'Crown Court in Northern Ireland',k:'crown court jury trial criminal serious offence'},
    {j:'northern-ireland',url:'/guides/criminal-plea-northern-ireland.html',title:'Criminal pleas in Northern Ireland',k:'plea guilty not guilty court trial'},
    {j:'northern-ireland',url:'/guides/criminal-legal-aid-northern-ireland.html',title:'Criminal legal aid in Northern Ireland',k:'legal aid solicitor lawyer cost criminal court'},
    {j:'northern-ireland',url:'/guides/complain-police-northern-ireland.html',title:'Complaining about police in Northern Ireland',k:'complaint complain psni police ombudsman misconduct officer'},
    {j:'northern-ireland',url:'/guides/protest-rights-northern-ireland.html',title:'Protest rights in Northern Ireland',k:'protest parade march demonstration public order police psni conditions'},

    {j:'uk-wide',url:'/guides/protest-signs-flags-proscribed-groups-uk.html',title:'Signs, flags and proscribed groups at UK protests',k:'protest sign flag banner symbol proscribed group terrorism support offence'},
    {j:'uk-wide',url:'/guides/abortion-safe-access-zones-uk.html',title:'Abortion safe-access zones across the UK',k:'abortion clinic safe access buffer zone protest demonstration offence'}
  ];

  const SYNONYMS = {
    lawyer:'solicitor legal advice', attorney:'solicitor legal advice', detained:'custody arrest', detention:'custody',
    held:'custody detention', cell:'custody police station', mask:'face covering balaclava', balaclava:'face covering mask',
    kid:'young under 18 child', child:'young under 18', minor:'young under 18', disability:'vulnerable appropriate adult',
    disabled:'vulnerable appropriate adult', meds:'medical medication', medicine:'medical medication', doctor:'medical health',
    complain:'complaint misconduct', complaint:'complain misconduct', dna:'forensic samples', fingerprints:'forensic samples',
    demonstration:'protest march', demo:'protest march', bail:'release conditions', charged:'charge court prosecution',
    interview:'questioning questions caution', silent:'silence questioning', search:'stop search', searched:'stop search'
  };

  const STOP = new Set('a an the and or but if then than to of in on at for from by with about into what when where why how can could should would do does did is are am was were be been being my me i we our you your they them their it this that have has had police officer officers'.split(' '));
  const labels = {scotland:'Scotland','england-wales':'England & Wales','northern-ireland':'Northern Ireland','uk-wide':'UK-wide'};

  const q = document.querySelector('#askQuestion');
  const jurisdiction = document.querySelector('#askJurisdiction');
  const submit = document.querySelector('#askSubmit');
  const status = document.querySelector('#askStatus');
  const results = document.querySelector('#askResults');
  if (!q || !jurisdiction || !submit || !status || !results) return;

  function normalise(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9\s&-]/g,' ').replace(/\s+/g,' ').trim();
  }

  function tokens(text) {
    const base = normalise(text).split(' ').filter(x => x.length > 1 && !STOP.has(x));
    const expanded = [...base];
    base.forEach(t => {
      const extra = SYNONYMS[t];
      if (extra) expanded.push(...extra.split(' '));
    });
    return [...new Set(expanded)];
  }

  function score(item, questionTokens, raw) {
    const hay = `${normalise(item.title)} ${normalise(item.k)}`;
    let points = 0;
    for (const t of questionTokens) {
      if (hay.includes(` ${t} `) || hay.startsWith(`${t} `) || hay.endsWith(` ${t}`)) points += 4;
      else if (hay.includes(t)) points += 2;
    }
    const title = normalise(item.title);
    for (const pair of ['stop search','legal advice','police station','how long','protest rights','face covering','legal aid','not guilty','appropriate adult','police complaint']) {
      if (raw.includes(pair) && (hay.includes(pair) || title.includes(pair))) points += 7;
    }
    return points;
  }

  function pickMatches(question) {
    const raw = normalise(question);
    const ts = tokens(question);
    return CATALOG
      .filter(item => item.j === jurisdiction.value || item.j === 'uk-wide')
      .map(item => ({...item, score:score(item, ts, raw)}))
      .filter(item => item.score >= 4)
      .sort((a,b) => b.score - a.score)
      .slice(0,3);
  }

  function clearResults() { results.textContent = ''; }

  function addText(el, text) { el.textContent = text; return el; }

  async function hydrate(item) {
    const card = document.createElement('section');
    card.className = 'ask-result';
    const meta = document.createElement('div'); meta.className = 'ask-meta';
    const j = document.createElement('span'); j.className = 'ask-pill'; j.textContent = labels[item.j] || item.j;
    const verified = document.createElement('span'); verified.className = 'ask-pill'; verified.textContent = 'Verified RightsRadar guide';
    meta.append(j, verified);
    const h = document.createElement('h2'); h.textContent = item.title;
    const why = document.createElement('p'); why.className = 'ask-match'; why.textContent = 'Best match from the verified guide library.';
    card.append(meta,h,why);

    try {
      const response = await fetch(item.url, {cache:'no-store', credentials:'same-origin'});
      if (!response.ok) throw new Error('Guide unavailable');
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html,'text/html');
      const pageTitle = doc.querySelector('.prose h1, main h1')?.textContent?.trim();
      if (pageTitle) h.textContent = pageTitle;

      const pills = [...doc.querySelectorAll('.meta .pill')].map(x => x.textContent.trim()).filter(Boolean);
      const reviewed = pills.find(x => /last checked|reviewed|updated/i.test(x));
      if (reviewed) { const p=document.createElement('span'); p.className='ask-pill'; p.textContent=reviewed; meta.appendChild(p); }

      const paragraphs = [...doc.querySelectorAll('.prose > p, article.prose > p')]
        .map(x => x.textContent.replace(/\s+/g,' ').trim())
        .filter(x => x.length > 45 && !/RightsRadar|not legal advice/i.test(x));
      if (paragraphs[0]) {
        const extract = document.createElement('div'); extract.className='ask-extract';
        const strong = document.createElement('strong'); strong.textContent='From the verified guide: ';
        extract.append(strong, document.createTextNode(paragraphs[0].slice(0,520) + (paragraphs[0].length>520?'…':'')));
        card.appendChild(extract);
      }

      const sourceLinks = [...doc.querySelectorAll('.sourcebox a')].slice(0,4);
      if (sourceLinks.length) {
        const src = document.createElement('div'); src.className='ask-sources';
        const sh = document.createElement('strong'); sh.textContent='Official sources in this guide'; src.appendChild(sh);
        sourceLinks.forEach(a => {
          const link=document.createElement('a'); link.href=a.href; link.target='_blank'; link.rel='noopener'; link.textContent=a.textContent.trim() || new URL(a.href).hostname; src.appendChild(link);
        });
        card.appendChild(src);
      }
    } catch {
      const note=document.createElement('p'); note.className='ask-match'; note.textContent='The guide details could not be loaded right now. You can still open the guide directly.'; card.appendChild(note);
    }

    const actions=document.createElement('div'); actions.className='ask-actions';
    const open=document.createElement('a'); open.className='rr-primary'; open.href=item.url; open.textContent='Open full verified guide';
    const save=document.createElement('a'); save.className='rr-secondary'; save.href=item.url; save.textContent='Open and save offline';
    actions.append(open,save); card.appendChild(actions);
    return card;
  }

  async function run() {
    const question = q.value.trim();
    clearResults();
    if (question.length < 4) { status.textContent='Type a short question or choose an example.'; q.focus(); return; }
    submit.disabled=true; status.textContent='Searching the verified guide library on this device…';
    const matches=pickMatches(question);
    if (!matches.length) {
      const box=document.createElement('div'); box.className='ask-empty';
      const strong=document.createElement('strong'); strong.textContent='I do not have enough verified information to answer that safely.';
      const p=document.createElement('p'); p.textContent='Try different words, use Help Now, or browse the full rights library. RightsRadar will not guess a legal rule when the verified library does not support it.';
      const a=document.createElement('a'); a.className='rr-primary'; a.href='/quick-help.html'; a.textContent='Open Help Now';
      box.append(strong,p,a); results.appendChild(box); status.textContent='No reliable match found.'; submit.disabled=false; return;
    }
    for (const item of matches) results.appendChild(await hydrate(item));
    status.textContent=`Found ${matches.length} verified guide${matches.length===1?'':'s'} for ${labels[jurisdiction.value]}. No AI model was used.`;
    submit.disabled=false;
  }

  try {
    const stored=localStorage.getItem('rr.jurisdiction');
    if (['scotland','england-wales','northern-ireland'].includes(stored)) jurisdiction.value=stored;
  } catch {}
  jurisdiction.addEventListener('change',()=>{ try{localStorage.setItem('rr.jurisdiction',jurisdiction.value);}catch{} });
  submit.addEventListener('click',run);
  q.addEventListener('keydown',e=>{ if ((e.ctrlKey||e.metaKey) && e.key==='Enter') run(); });
  document.querySelectorAll('.ask-example').forEach(btn=>btn.addEventListener('click',()=>{ q.value=btn.textContent.trim(); run(); }));

  const params=new URLSearchParams(location.search);
  const preset=params.get('q');
  if (preset) { q.value=preset.slice(0,600); run(); }
})();

(()=>{
  const threadsHost=document.querySelector('#communityThreads');
  const toolbar=document.querySelector('.community-toolbar');
  const accountActions=document.querySelector('.account-actions');
  const status=document.querySelector('#communityStatus');
  if(!threadsHost||!toolbar||!accountActions)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>{try{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d))}catch{return ''}};
  const topicNames={general:'General',police:'Police',housing:'Housing',benefits:'Benefits',protest:'Protest',courts:'Courts',driving:'Driving',employment:'Employment',consumer:'Consumer'};
  const topics=Object.keys(topicNames);
  let featureData={user:null,threadStats:[],topicFollows:[],notifications:[],unreadCount:0};
  let refreshTimer=null;

  const style=document.createElement('style');
  style.textContent=`
    .rr-tools{border:1px solid #27384e;background:#0b131e;border-radius:14px;padding:12px;margin:12px 0 16px}.rr-search-row{display:grid;grid-template-columns:minmax(0,1fr) 150px 165px;gap:8px}.rr-search-row input,.rr-search-row select{width:100%;background:#09111b;color:var(--ink);border:1px solid #2a394f;border-radius:10px;padding:9px 10px;font:inherit;font-size:.82rem}.rr-topic-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center}.rr-topic-label{font-size:.72rem;color:var(--muted);font-weight:800;margin-right:2px}.rr-topic{border:1px solid #314157;border-radius:999px;background:#121c2a;color:#b9c6d7;padding:6px 9px;font-size:.72rem;cursor:pointer}.rr-topic.active{background:#12382f;border-color:#286450;color:#98e5c8}.rr-topic:disabled{opacity:.55;cursor:not-allowed}.rr-member-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.rr-member-tools a,.rr-notify-btn{border:1px solid #314157;background:#111b29;color:#d8e3f0;border-radius:9px;padding:7px 9px;text-decoration:none;font-size:.76rem;font-weight:800;cursor:pointer}.rr-notify-btn.has-unread{border-color:#355fc1;background:#152a58}.rr-notify-panel{border:1px solid #30415a;background:#0a121d;border-radius:13px;padding:12px;margin:0 0 14px}.rr-notify-panel[hidden]{display:none}.rr-notify-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}.rr-notify-item{padding:9px 0;border-top:1px solid #1d2b3e}.rr-notify-item:first-of-type{border-top:0}.rr-notify-item.unread strong{color:#fff}.rr-notify-item strong{display:block;font-size:.8rem;color:#c9d4e3}.rr-notify-item span{font-size:.7rem;color:#7f8ea4}.rr-notify-item p{margin:3px 0;color:#aebbd0;font-size:.76rem}.rr-notify-item a{font-size:.72rem}.rr-thread-feature{border:0;background:transparent;color:#8fb0ff;cursor:pointer;font:inherit;font-size:.8rem;padding:0}.rr-thread-feature.active{color:#80d7b8}.rr-profile-link{font-size:.78rem;color:#91abdd}.rr-filter-empty{display:none;padding:12px;color:var(--muted);font-size:.82rem}.rr-small-action{border:0;background:transparent;color:#91abdd;cursor:pointer;font-size:.72rem}@media(max-width:760px){.rr-search-row{grid-template-columns:1fr}.rr-tools{padding:10px}}`;
  document.head.appendChild(style);

  const tools=document.createElement('div');
  tools.className='rr-tools';
  tools.innerHTML=`<div class="rr-search-row"><input id="rrCommunitySearch" type="search" placeholder="Search discussions…" aria-label="Search discussions"><select id="rrCommunityCategory" aria-label="Filter by topic"><option value="">All topics</option>${topics.map(t=>`<option value="${t}">${topicNames[t]}</option>`).join('')}</select><select id="rrCommunityJurisdiction" aria-label="Filter by jurisdiction"><option value="">All jurisdictions</option><option value="uk-wide">UK-wide</option><option value="scotland">Scotland</option><option value="england-wales">England &amp; Wales</option><option value="northern-ireland">Northern Ireland</option></select></div><div class="rr-topic-row" id="rrTopicRow"><span class="rr-topic-label">Follow topics:</span>${topics.map(t=>`<button class="rr-topic" type="button" data-topic="${t}">${topicNames[t]}</button>`).join('')}</div>`;
  const notice=toolbar.nextElementSibling;
  if(notice)notice.insertAdjacentElement('afterend',tools);else toolbar.insertAdjacentElement('afterend',tools);

  const memberTools=document.createElement('div');
  memberTools.className='rr-member-tools';
  memberTools.innerHTML=`<a id="rrMyProfile" href="member.html" hidden>My profile</a><button id="rrNotifyButton" class="rr-notify-btn" type="button" hidden>Notifications</button>`;
  accountActions.prepend(memberTools);

  const notifyPanel=document.createElement('div');
  notifyPanel.id='rrNotifyPanel';
  notifyPanel.className='rr-notify-panel';
  notifyPanel.hidden=true;
  tools.insertAdjacentElement('afterend',notifyPanel);

  const empty=document.createElement('div');
  empty.className='rr-filter-empty';
  empty.textContent='No discussions match those filters.';
  threadsHost.insertAdjacentElement('afterend',empty);

  const search=tools.querySelector('#rrCommunitySearch');
  const category=tools.querySelector('#rrCommunityCategory');
  const jurisdiction=tools.querySelector('#rrCommunityJurisdiction');
  const notifyButton=memberTools.querySelector('#rrNotifyButton');
  const profileLink=memberTools.querySelector('#rrMyProfile');

  async function request(url,options={}){
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||'Request failed.');
    return data;
  }
  function show(message,error=false){
    if(!status)return;
    status.style.display='block';
    status.className='statusline'+(error?' error':'');
    status.textContent=message;
  }
  function threadIds(){return [...threadsHost.querySelectorAll('.thread[data-thread-id]')].map(x=>x.dataset.threadId).filter(Boolean);}

  function applyFilters(){
    const q=search.value.trim().toLowerCase();
    const cat=category.value;
    const jur=jurisdiction.value;
    let shown=0;
    [...threadsHost.querySelectorAll('.thread')].forEach(thread=>{
      const text=thread.textContent.toLowerCase();
      const meta=thread.querySelector('.thread-meta')?.textContent.toLowerCase()||'';
      const matchesQ=!q||text.includes(q);
      const matchesCat=!cat||meta.includes(` · ${cat}`)||meta.endsWith(cat);
      const matchesJur=!jur||meta.includes(jur);
      const visible=matchesQ&&matchesCat&&matchesJur;
      thread.style.display=visible?'':'none';
      if(visible)shown++;
    });
    empty.style.display=shown||!threadsHost.querySelector('.thread')?'none':'block';
  }

  function renderTopicFollows(){
    const active=new Set(featureData.topicFollows||[]);
    tools.querySelectorAll('[data-topic]').forEach(btn=>{
      const on=active.has(btn.dataset.topic);
      btn.classList.toggle('active',on);
      btn.disabled=!featureData.user;
      btn.title=featureData.user?(on?'Stop following this topic':'Follow this topic'):'Sign in to follow topics';
    });
  }

  function renderMemberTools(){
    const signed=Boolean(featureData.user);
    profileLink.hidden=!signed;
    notifyButton.hidden=!signed;
    if(signed)profileLink.href=`member.html?u=${encodeURIComponent(featureData.user.id)}`;
    const count=Number(featureData.unreadCount)||0;
    notifyButton.textContent=`Notifications${count?` (${count})`:''}`;
    notifyButton.classList.toggle('has-unread',count>0);
  }

  function renderNotifications(){
    const items=featureData.notifications||[];
    notifyPanel.innerHTML=`<div class="rr-notify-head"><strong>Notifications</strong><button class="rr-small-action" type="button" data-mark-all>Mark all read</button></div>${items.length?items.map(n=>`<div class="rr-notify-item ${n.readAt?'':'unread'}"><strong>${esc(n.title)}</strong>${n.body?`<p>${esc(n.body)}</p>`:''}<span>${fmt(n.createdAt)}</span>${n.url?` · <a href="${esc(n.url)}" data-notification-id="${n.id}">Open</a>`:''}</div>`).join(''):'<div class="small">No notifications yet.</div>'}`;
  }

  function decorateThreads(){
    const stats=new Map((featureData.threadStats||[]).map(x=>[String(x.id),x]));
    [...threadsHost.querySelectorAll('.thread[data-thread-id]')].forEach(thread=>{
      const id=String(thread.dataset.threadId);
      const st=stats.get(id);
      if(!st)return;
      thread.id=`thread-${id}`;
      let holder=thread.querySelector('.rr-thread-features');
      if(!holder){
        holder=document.createElement('span');
        holder.className='rr-thread-features';
        const actions=thread.querySelector('.thread-actions');
        if(actions)actions.appendChild(holder);
      }
      if(!holder)return;
      const signed=Boolean(featureData.user);
      holder.innerHTML=` · <button type="button" class="rr-thread-feature ${st.helpfulByMe?'active':''}" data-helpful="${id}" title="${signed?'Mark as helpful':'Sign in to vote'}">Helpful ${Number(st.helpfulCount)||0}</button> · <button type="button" class="rr-thread-feature ${st.followedByMe?'active':''}" data-follow-thread="${id}" title="${signed?'Follow replies':'Sign in to follow'}">${st.followedByMe?'Following':'Follow'} ${Number(st.followerCount)||0}</button>${st.authorUserId?` · <a class="rr-profile-link" href="member.html?u=${encodeURIComponent(st.authorUserId)}">Profile</a>`:''}`;
    });
    applyFilters();
    if(location.hash&&location.hash.startsWith('#thread-')){const target=document.querySelector(location.hash);if(target&&!target.dataset.rrScrolled){target.dataset.rrScrolled='1';setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'center'}),120);}}
  }

  async function refreshFeatures(){
    const ids=threadIds();
    try{
      featureData=await request(`/api/community-features?threadIds=${encodeURIComponent(ids.join(','))}`);
      renderTopicFollows();renderMemberTools();renderNotifications();decorateThreads();
    }catch(err){console.warn('RightsRadar member features unavailable',err);}
  }
  function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshFeatures,250);}

  [search,category,jurisdiction].forEach(el=>el.addEventListener(el===search?'input':'change',applyFilters));
  tools.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-topic]');
    if(!btn)return;
    if(!featureData.user){show('Sign in to follow Community topics.',true);return;}
    btn.disabled=true;
    try{await request('/api/community-features',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'toggle-topic-follow',topic:btn.dataset.topic})});await refreshFeatures();}
    catch(err){show(err.message,true);}finally{btn.disabled=false;}
  });

  threadsHost.addEventListener('click',async e=>{
    const helpful=e.target.closest('[data-helpful]');
    const follow=e.target.closest('[data-follow-thread]');
    if(!helpful&&!follow)return;
    if(!featureData.user){show('Sign in to use Helpful and Follow.',true);return;}
    const button=helpful||follow;
    button.disabled=true;
    try{
      await request('/api/community-features',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(helpful?{action:'toggle-helpful',threadId:Number(helpful.dataset.helpful)}:{action:'toggle-thread-follow',threadId:Number(follow.dataset.followThread)})});
      await refreshFeatures();
    }catch(err){show(err.message,true);}finally{button.disabled=false;}
  });

  notifyButton.addEventListener('click',()=>{notifyPanel.hidden=!notifyPanel.hidden;if(!notifyPanel.hidden)renderNotifications();});
  notifyPanel.addEventListener('click',async e=>{
    if(e.target.closest('[data-mark-all]')){
      try{await request('/api/community-features',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'mark-notifications-read'})});await refreshFeatures();}
      catch(err){show(err.message,true);}
      return;
    }
    const link=e.target.closest('[data-notification-id]');
    if(link){
      request('/api/community-features',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'mark-notifications-read',id:Number(link.dataset.notificationId)})}).catch(()=>{});
    }
  });

  const observer=new MutationObserver(scheduleRefresh);
  observer.observe(threadsHost,{childList:true});
  setTimeout(refreshFeatures,300);
  setInterval(()=>{if(!document.hidden&&featureData.user)refreshFeatures();},30000);
})();

(()=>{
  const $=s=>document.querySelector(s);
  const news=$('#communityNews');
  const threads=$('#communityThreads');
  const status=$('#communityStatus');
  const authButton=$('#communityLogin');
  const signOut=$('#communitySignOut');
  const member=$('#communityMember');
  const composer=$('#communityComposer');
  const postForm=$('#communityPostForm');
  const modal=$('#authModal');
  const authStatus=$('#authStatus');
  const authTitle=$('#authTitle');
  const signInForm=$('#signInForm');
  const signUpForm=$('#signUpForm');
  let currentUser=null;
  let communityData={threads:[],comments:[]};

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>{try{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d))}catch{return ''}};
  const showStatus=(message,error=false)=>{status.className='statusline'+(error?' error':'');status.style.display='block';status.textContent=message;};
  const clearStatus=()=>{status.style.display='none';status.textContent='';};

  async function jsonFetch(url,options={}){
    const r=await fetch(url,{credentials:'same-origin',...options});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||'Request failed.');
    return data;
  }

  function setAuthUI(){
    const signed=Boolean(currentUser);
    authButton.style.display=signed?'none':'inline-flex';
    signOut.style.display=signed?'inline-flex':'none';
    member.style.display=signed?'block':'none';
    member.textContent=signed?`Signed in as ${currentUser.name}`:'';
    composer.classList.toggle('locked',!signed);
    [...postForm.querySelectorAll('input,textarea,select,button')].forEach(el=>el.disabled=!signed);
    $('#composerHint').textContent=signed?'Your display name comes from your RightsRadar account.':'Sign in or create an account to start a conversation.';
  }

  function openAuth(mode='signin'){
    modal.hidden=false;
    document.body.style.overflow='hidden';
    switchAuth(mode);
    setTimeout(()=>$('#'+(mode==='signup'?'signUpName':'signInEmail'))?.focus(),0);
  }
  function closeAuth(){modal.hidden=true;document.body.style.overflow='';authStatus.style.display='none';}
  function switchAuth(mode){
    const signup=mode==='signup';
    authTitle.textContent=signup?'Create a RightsRadar account':'Sign in to RightsRadar';
    signInForm.hidden=signup;
    signUpForm.hidden=!signup;
    $('#showSignIn').classList.toggle('active',!signup);
    $('#showSignUp').classList.toggle('active',signup);
    authStatus.style.display='none';
  }

  async function refreshAuth(){
    try{
      const data=await jsonFetch('/api/auth');
      currentUser=data.authenticated?data.user:null;
    }catch{currentUser=null;}
    setAuthUI();
  }

  async function refreshCommunity(){
    try{
      const data=await jsonFetch('/api/community');
      currentUser=data.user||currentUser;
      communityData=data;
      setAuthUI();
      renderThreads();
    }catch(err){threads.innerHTML=`<div class="statusline error" style="display:block">${esc(err.message)}</div>`;}
  }

  function renderThreads(){
    const list=communityData.threads||[];
    const comments=communityData.comments||[];
    if(!list.length){threads.innerHTML='<div class="small">No discussions yet.</div>';return;}
    threads.innerHTML=list.map(t=>{
      const threadComments=comments.filter(c=>String(c.threadId)===String(t.id));
      const commentsHtml=threadComments.length?`<div class="comments">${threadComments.map(c=>`<div class="comment"><div class="thread-meta"><strong>${esc(c.authorName)}</strong> · ${fmt(c.createdAt)}</div><div>${esc(c.body)}</div>${currentUser?`<button class="text-action report-comment" data-comment-id="${c.id}" data-thread-id="${t.id}">Report</button>`:''}</div>`).join('')}</div>`:'';
      return `<article class="thread" data-thread-id="${t.id}">
        <div class="thread-head"><span class="${t.isOfficial?'verified-badge':'user-badge'}">${t.isOfficial?'RightsRadar verified':'Community post'}</span><span class="thread-meta">${esc(t.authorName)} · ${fmt(t.createdAt)} · ${esc(t.jurisdiction)} · ${esc(t.category)}</span></div>
        <h3>${esc(t.title)}</h3><p>${esc(t.body)}</p>
        <div class="thread-actions"><span class="thread-meta">${Number(t.commentCount)||0} comments</span>${currentUser?`<button class="text-action reply-toggle" data-thread-id="${t.id}">Reply</button><button class="text-action report-thread" data-thread-id="${t.id}">Report</button>`:''}</div>
        ${commentsHtml}
        ${currentUser?`<form class="reply-form" data-thread-id="${t.id}" hidden><textarea maxlength="2000" required placeholder="Write a comment…"></textarea><div class="reply-actions"><button class="btn btn-secondary" type="button" data-cancel-reply>Cancel</button><button class="btn btn-primary" type="submit">Post reply</button></div></form>`:''}
      </article>`;
    }).join('');

    document.querySelectorAll('.reply-toggle').forEach(btn=>btn.addEventListener('click',()=>{
      const form=document.querySelector(`.reply-form[data-thread-id="${btn.dataset.threadId}"]`);
      if(form){form.hidden=!form.hidden;if(!form.hidden)form.querySelector('textarea').focus();}
    }));
    document.querySelectorAll('[data-cancel-reply]').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.reply-form').hidden=true));
    document.querySelectorAll('.reply-form').forEach(form=>form.addEventListener('submit',postReply));
    document.querySelectorAll('.report-thread').forEach(btn=>btn.addEventListener('click',()=>reportContent({threadId:Number(btn.dataset.threadId)})));
    document.querySelectorAll('.report-comment').forEach(btn=>btn.addEventListener('click',()=>reportContent({threadId:Number(btn.dataset.threadId),commentId:Number(btn.dataset.commentId)})));
  }

  async function postReply(e){
    e.preventDefault();clearStatus();
    const form=e.currentTarget;
    const textarea=form.querySelector('textarea');
    try{
      await jsonFetch('/api/community',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'create-comment',threadId:Number(form.dataset.threadId),body:textarea.value})});
      textarea.value='';form.hidden=true;showStatus('Comment posted.');await refreshCommunity();
    }catch(err){showStatus(err.message,true);}
  }

  async function reportContent(target){
    const reason=window.prompt('Why are you reporting this content? Please do not include private case details.');
    if(!reason)return;
    try{
      const data=await jsonFetch('/api/community',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'report',...target,reason})});
      showStatus(data.message||'Report received.');
    }catch(err){showStatus(err.message,true);}
  }

  postForm.addEventListener('submit',async e=>{
    e.preventDefault();clearStatus();
    const data=new FormData(postForm);
    try{
      const result=await jsonFetch('/api/community',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'create-thread',title:data.get('title'),body:data.get('body'),category:data.get('category'),jurisdiction:data.get('jurisdiction')})});
      postForm.reset();$('#postJurisdiction').value='uk-wide';showStatus(result.message||'Conversation posted.');await refreshCommunity();
    }catch(err){showStatus(err.message,true);}
  });

  signInForm.addEventListener('submit',async e=>{
    e.preventDefault();authStatus.style.display='block';authStatus.className='statusline';authStatus.textContent='Signing in…';
    const data=new FormData(signInForm);
    try{
      const result=await jsonFetch('/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'sign-in',email:data.get('email'),password:data.get('password')})});
      currentUser=result.user;closeAuth();showStatus('Signed in. You can now post and reply.');await refreshCommunity();
    }catch(err){authStatus.className='statusline error';authStatus.style.display='block';authStatus.textContent=err.message;}
  });

  signUpForm.addEventListener('submit',async e=>{
    e.preventDefault();authStatus.style.display='block';authStatus.className='statusline';authStatus.textContent='Creating account…';
    const data=new FormData(signUpForm);
    if(data.get('password')!==data.get('confirm')){authStatus.className='statusline error';authStatus.textContent='Passwords do not match.';return;}
    try{
      const result=await jsonFetch('/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'sign-up',name:data.get('name'),email:data.get('email'),password:data.get('password')})});
      if(result.authenticated){currentUser=result.user;closeAuth();showStatus('Account created. You can now join the discussion.');await refreshCommunity();}
      else{authStatus.textContent=result.message||'Account created. Sign in when verification is complete.';}
    }catch(err){authStatus.className='statusline error';authStatus.style.display='block';authStatus.textContent=err.message;}
  });

  authButton.addEventListener('click',e=>{e.preventDefault();openAuth('signin');});
  signOut.addEventListener('click',async()=>{
    try{await jsonFetch('/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'sign-out'})});}catch{}
    currentUser=null;setAuthUI();renderThreads();showStatus('Signed out.');
  });
  $('#authClose').addEventListener('click',closeAuth);
  $('#showSignIn').addEventListener('click',()=>switchAuth('signin'));
  $('#showSignUp').addEventListener('click',()=>switchAuth('signup'));
  modal.addEventListener('click',e=>{if(e.target===modal)closeAuth();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeAuth();});

  fetch('/api/new-laws').then(r=>r.json()).then(data=>{
    const items=[...(data.laws||[]),...(data.bills||[])].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,6);
    news.innerHTML=items.length?items.map(x=>`<a class="news-item" href="${esc(x.url)}" target="_blank" rel="noopener"><strong>${esc(x.title)}</strong><span>${esc(x.status)} · ${esc(x.source)}${x.date?' · '+fmt(x.date):''}</span></a>`).join(''):'<div class="small">Official feed temporarily unavailable.</div>';
  }).catch(()=>{news.innerHTML='<div class="small">Official feed temporarily unavailable.</div>';});

  Promise.all([refreshAuth(),refreshCommunity()]);
})();

(()=>{
  const host=document.querySelector('.ads-column');
  if(!host)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>{try{return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(d))}catch{return ''}};
  const style=document.createElement('style');
  style.textContent=`
    .rr-chat-panel{position:static!important;margin-bottom:14px}.rr-chat-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.rr-chat-head h2{margin:0}.rr-chat-badge{font-size:.67rem;font-weight:850;color:#9ed9c9;border:1px solid #285648;background:#10251e;border-radius:999px;padding:4px 7px}.rr-chat-messages{height:310px;overflow:auto;border:1px solid #26354a;border-radius:12px;background:#09111b;padding:10px;margin:12px 0}.rr-chat-message{padding:8px 0;border-top:1px solid #182638}.rr-chat-message:first-child{border-top:0}.rr-chat-meta{font-size:.7rem;color:#8292a8;display:flex;gap:6px;align-items:center;justify-content:space-between}.rr-chat-author{color:#c8d5e7;font-weight:800}.rr-chat-body{font-size:.83rem;color:#b9c6d7;white-space:pre-wrap;overflow-wrap:anywhere;margin-top:3px}.rr-chat-report{border:0;background:transparent;color:#809fdc;font-size:.68rem;cursor:pointer;padding:0}.rr-chat-form{display:flex;gap:7px}.rr-chat-form input{min-width:0;flex:1;background:#0a111c;color:var(--ink);border:1px solid #2a394f;border-radius:10px;padding:9px 10px;font:inherit;font-size:.82rem}.rr-chat-form button{border:0;border-radius:10px;background:#315fc4;color:#fff;font-weight:800;padding:9px 11px;cursor:pointer}.rr-chat-form button:disabled,.rr-chat-form input:disabled{opacity:.55;cursor:not-allowed}.rr-chat-note{font-size:.7rem;color:#77869b;margin:8px 0 0}.rr-chat-status{font-size:.72rem;color:#9ed9c9;margin-top:7px}.rr-chat-status.error{color:#efb7bf}@media(max-width:1000px){.rr-chat-panel{position:static!important}}`;
  document.head.appendChild(style);

  const panel=document.createElement('div');
  panel.className='side-panel rr-chat-panel';
  panel.innerHTML=`<div class="rr-chat-head"><h2>Member chat</h2><span class="rr-chat-badge">Members only</span></div><p class="small">Quick community chat. User messages are not verified legal advice.</p><div id="rrChatMessages" class="rr-chat-messages"><div class="small">Sign in to view member chat.</div></div><form id="rrChatForm" class="rr-chat-form"><input id="rrChatInput" maxlength="500" autocomplete="off" placeholder="Write a message…" disabled><button type="submit" disabled>Send</button></form><div id="rrChatStatus" class="rr-chat-status"></div><p class="rr-chat-note">Do not share private case details, addresses, phone numbers or medical information.</p>`;
  host.prepend(panel);

  const box=panel.querySelector('#rrChatMessages');
  const form=panel.querySelector('#rrChatForm');
  const input=panel.querySelector('#rrChatInput');
  const button=form.querySelector('button');
  const status=panel.querySelector('#rrChatStatus');
  let user=null;
  let loading=false;

  async function request(url,options={}){
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(data.error||'Chat request failed.');e.status=r.status;throw e;}
    return data;
  }

  function setLocked(message='Sign in to view member chat.'){
    user=null;input.disabled=true;button.disabled=true;box.innerHTML=`<div class="small">${esc(message)}</div>`;
  }

  function render(data){
    user=data.user||null;
    const messages=data.messages||[];
    input.disabled=!user;button.disabled=!user;
    const nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<60;
    if(!messages.length){box.innerHTML='<div class="small">No messages yet. Start the chat.</div>';return;}
    box.innerHTML=messages.map(m=>`<div class="rr-chat-message"><div class="rr-chat-meta"><span><span class="rr-chat-author">${esc(m.authorName)}</span> · ${fmt(m.createdAt)}</span>${user&&String(user.id)!==String(m.authorUserId)?`<button class="rr-chat-report" type="button" data-chat-report="${m.id}">Report</button>`:''}</div><div class="rr-chat-body">${esc(m.body)}</div></div>`).join('');
    if(nearBottom||!box.dataset.loaded)box.scrollTop=box.scrollHeight;
    box.dataset.loaded='1';
  }

  async function load(){
    if(loading||document.hidden)return;
    loading=true;
    try{render(await request('/api/chat'));status.textContent='';status.className='rr-chat-status';}
    catch(err){if(err.status===401)setLocked();else{status.textContent=err.message;status.className='rr-chat-status error';}}
    finally{loading=false;}
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const text=input.value.trim();
    if(!text)return;
    button.disabled=true;status.textContent='Sending…';status.className='rr-chat-status';
    try{await request('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'send',body:text})});input.value='';await load();status.textContent='';}
    catch(err){status.textContent=err.message;status.className='rr-chat-status error';}
    finally{button.disabled=!user;}
  });

  panel.addEventListener('click',async e=>{
    const b=e.target.closest('[data-chat-report]');
    if(!b)return;
    const reason=window.prompt('Why are you reporting this chat message?');
    if(!reason)return;
    try{const data=await request('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'report',messageId:Number(b.dataset.chatReport),reason})});status.textContent=data.message||'Reported.';status.className='rr-chat-status';}
    catch(err){status.textContent=err.message;status.className='rr-chat-status error';}
  });

  const member=document.querySelector('#communityMember');
  if(member)new MutationObserver(()=>load()).observe(member,{attributes:true,childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  setInterval(load,10000);
  load();
})();

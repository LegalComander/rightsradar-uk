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

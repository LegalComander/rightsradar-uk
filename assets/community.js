(()=>{
  if(!document.querySelector('link[href="assets/theme.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='assets/theme.css?v=20260916';document.head.appendChild(css)}
  if(!document.querySelector('script[src^="assets/theme.js"]')){const theme=document.createElement('script');theme.src='assets/theme.js?v=20260916';document.head.appendChild(theme)}
  function load(src,next){const s=document.createElement('script');s.src=src;if(next)s.addEventListener('load',next,{once:true});document.body.appendChild(s)}
  function modernNav(){
    const nav=document.querySelector('.navlinks');if(!nav)return;
    const community=[...nav.querySelectorAll('a')].find(a=>/community\.html/.test(a.getAttribute('href')||''));if(!community)return;
    community.id='rrNavAccount';community.textContent='Login';community.style.cssText='border:1px solid #5578ce;border-radius:999px;padding:8px 15px';
    fetch('/api/auth',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(data=>{if(data.authenticated&&data.user){const first=String(data.user.name||data.user.email||'Member').trim().split(/\s+/)[0];community.textContent=first||'Account';community.title='Open Community account'}else{community.textContent='Login';community.title='Sign in or create an account'}}).catch(()=>{community.textContent='Login'});
  }
  function decorateChat(){
    const head=document.querySelector('.rr-chat-head');if(!head||head.querySelector('.rr-advocate-avatar'))return;
    head.style.justifyContent='flex-start';
    const avatar=document.createElement('img');avatar.className='rr-advocate-avatar';avatar.src='assets/advocate.svg';avatar.alt='RightsRadar advocate';avatar.width=48;avatar.height=48;avatar.style.cssText='width:48px;height:48px;border-radius:50%;object-fit:cover;box-shadow:0 6px 18px rgba(49,95,196,.28);flex:0 0 auto';head.prepend(avatar);
    const h=head.querySelector('h2');if(h){h.textContent='Advocate Chat';h.style.fontSize='1rem'}
    const badge=head.querySelector('.rr-chat-badge');if(badge)badge.style.marginLeft='auto';
  }
  function addPasswordRecovery(){
    const form=document.getElementById('signInForm');if(!form||form.querySelector('#forgotPassword'))return;
    const password=form.querySelector('#signInPassword');if(!password)return;
    const row=document.createElement('div');row.style.cssText='display:flex;justify-content:flex-end;margin:7px 2px 2px';
    const forgot=document.createElement('button');forgot.id='forgotPassword';forgot.type='button';forgot.textContent='Forgot password?';forgot.style.cssText='border:0;background:transparent;color:#8fc9ff;font:inherit;font-size:.8rem;font-weight:750;cursor:pointer;padding:2px 0';row.appendChild(forgot);password.insertAdjacentElement('afterend',row);
    forgot.addEventListener('click',async()=>{
      const email=document.getElementById('signInEmail');const status=document.getElementById('authStatus');const address=String(email?.value||'').trim();
      if(!address){status.style.display='block';status.className='statusline error';status.textContent='Enter your email address first, then press Forgot password.';email?.focus();return}
      forgot.disabled=true;status.style.display='block';status.className='statusline';status.textContent='Sending a secure reset link…';
      try{const r=await fetch('/api/auth',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'request-password-reset',email:address})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Unable to request a password reset.');status.className='statusline';status.textContent=data.message||'If that account exists, a reset link will be sent shortly.'}
      catch(err){status.className='statusline error';status.textContent=err.message}finally{forgot.disabled=false}
    });
  }
  modernNav();
  load('assets/community-core.js?v=20260916d',()=>{modernNav();decorateChat();addPasswordRecovery();load('assets/community-features.js?v=20260916',decorateChat)});
})();

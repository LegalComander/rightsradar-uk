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
  modernNav();
  load('assets/community-core.js?v=20260916',()=>{modernNav();decorateChat();load('assets/community-features.js?v=20260916',decorateChat)});
})();

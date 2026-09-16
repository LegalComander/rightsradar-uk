(()=>{
  // Load the persistent Light / Dark / System theme before community features.
  if(!document.querySelector('link[href="assets/theme.css"]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='assets/theme.css?v=20260916';document.head.appendChild(css);
  }
  if(!document.querySelector('script[src^="assets/theme.js"]')){
    const theme=document.createElement('script');theme.src='assets/theme.js?v=20260916';document.head.appendChild(theme);
  }

  function load(src,next){
    const s=document.createElement('script');
    s.src=src;
    if(next)s.addEventListener('load',next,{once:true});
    document.body.appendChild(s);
  }

  function modernNav(){
    const nav=document.querySelector('.navlinks');
    if(!nav)return;
    const community=[...nav.querySelectorAll('a')].find(a=>/community\.html/.test(a.getAttribute('href')||''));
    if(!community)return;
    community.id='rrNavAccount';
    community.textContent='Login';
    community.classList.add('rr-nav-login');
    fetch('/api/auth',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(data=>{
      if(data.authenticated&&data.user){
        const first=String(data.user.name||data.user.email||'Member').trim().split(/\s+/)[0];
        community.textContent=first||'Account';
        community.title='Open Community account';
      }else{
        community.textContent='Login';
        community.title='Sign in or create an account';
      }
    }).catch(()=>{community.textContent='Login';});
  }

  modernNav();
  load('assets/community-core.js?v=20260916',()=>{
    modernNav();
    load('assets/community-features.js?v=20260916');
  });
})();

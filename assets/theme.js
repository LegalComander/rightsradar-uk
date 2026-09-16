(()=>{
  const KEY='rr-theme';
  const root=document.documentElement;
  const system=()=>matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  const stored=()=>{try{return localStorage.getItem(KEY)||'system'}catch{return 'system'}};
  function apply(choice){
    const resolved=choice==='system'?system():choice;
    root.dataset.theme=resolved;
    root.dataset.themeChoice=choice;
    document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===choice));
  }
  function mount(){
    if(document.getElementById('rrThemeSwitcher'))return;
    const el=document.createElement('div');
    el.id='rrThemeSwitcher';el.className='rr-theme-switcher';el.setAttribute('aria-label','Colour theme');
    el.innerHTML='<button type="button" data-theme-choice="light" title="Light theme">☀️</button><button type="button" data-theme-choice="dark" title="Dark theme">🌙</button><button type="button" data-theme-choice="system" title="Use device theme">◐</button>';
    document.body.appendChild(el);
    el.addEventListener('click',e=>{const b=e.target.closest('[data-theme-choice]');if(!b)return;try{localStorage.setItem(KEY,b.dataset.themeChoice)}catch{}apply(b.dataset.themeChoice)});
    apply(stored());
  }
  apply(stored());
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();
  matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>{if(stored()==='system')apply('system')});
})();
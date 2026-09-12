(()=>{
  function load(src,next){
    const s=document.createElement('script');
    s.src=src;
    if(next)s.addEventListener('load',next,{once:true});
    document.body.appendChild(s);
  }
  load('assets/community-core.js?v=20260912',()=>load('assets/community-features.js?v=20260912'));
})();

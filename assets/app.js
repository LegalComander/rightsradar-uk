const menu=document.querySelector('.menu'); const nav=document.querySelector('.navlinks');
if(menu&&nav)menu.addEventListener('click',()=>nav.classList.toggle('open'));
const q=document.querySelector('#siteSearch'); const region=document.querySelector('#regionFilter'); const cards=[...document.querySelectorAll('[data-search]')]; const empty=document.querySelector('#emptySearch');
function filter(){if(!q)return;const term=q.value.toLowerCase().trim();const reg=region?.value||'all';let shown=0;cards.forEach(c=>{const okText=!term||c.dataset.search.toLowerCase().includes(term);const okReg=reg==='all'||c.dataset.region===reg||c.dataset.region==='uk';const ok=okText&&okReg;c.style.display=ok?'block':'none';if(ok)shown++});if(empty)empty.style.display=shown?'none':'block'}
q?.addEventListener('input',filter);region?.addEventListener('change',filter);
const form=document.querySelector('#alertForm');
form?.addEventListener('submit',e=>{e.preventDefault();const email=form.querySelector('input[type=email]').value;const area=form.querySelector('select').value;localStorage.setItem('kyruk_alert_demo',JSON.stringify({email,area}));const s=document.querySelector('#alertStatus');s.style.display='block';s.textContent='Saved on this device for the demo. Email delivery will be connected in the accounts phase.'});

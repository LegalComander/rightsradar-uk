(()=>{
  const form=document.querySelector('#aiChatForm'), input=document.querySelector('#aiChatInput'), log=document.querySelector('#aiChatLog'), status=document.querySelector('#aiChatStatus'), meter=document.querySelector('#aiMeter'), j=document.querySelector('#askJurisdiction');
  if(!form||!input||!log||!status||!meter||!j)return;
  let history=[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function request(url,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal,...options});
      const d=await r.json().catch(()=>({}));
      if(!r.ok){const e=new Error(d.error||'Request failed.');e.code=d.code;e.data=d;throw e;}
      return d;
    }catch(e){
      if(e?.name==='AbortError'){const t=new Error('The account check timed out. Please refresh and try again.');t.code='ACCOUNT_CHECK_TIMEOUT';throw t;}
      throw e;
    }finally{clearTimeout(timer);}
  }
  function bubble(role,text){const el=document.createElement('div');el.className=`ai-bubble ${role}`;el.innerHTML=`<strong>${role==='user'?'You':'RightsRadar AI'}</strong><div>${esc(text).replace(/\n/g,'<br>')}</div>`;log.appendChild(el);log.scrollTop=log.scrollHeight;}
  function updateMeter(d){meter.textContent=d.plan==='plus'?`Plus · ${d.remaining} of ${d.limit} messages remaining this month`:`Free · ${d.remaining} of ${d.limit} AI questions remaining this month`;}
  async function state(){
    meter.textContent='Checking account…';
    status.textContent='Connecting to your RightsRadar account…';
    try{
      const d=await request('/api/ai-assistant');
      updateMeter(d);
      input.disabled=false;
      form.querySelector('button').disabled=false;
      status.textContent=d.aiConfigured?'Multilingual AI is ready. Answers are restricted to matched verified RightsRadar guides.':'AI chat is installed but awaits the secure provider key. Verified guide search below still works.';
    }catch(e){
      input.disabled=true;
      form.querySelector('button').disabled=true;
      if(e.code==='SIGN_IN_REQUIRED'){
        meter.textContent='Sign in required';
        status.innerHTML=`Sign in through the <a href="/community.html#login">RightsRadar account</a> to use conversational AI. Verified guide search remains free below.`;
      }else{
        meter.textContent='Account check failed';
        status.textContent=e.message||'Unable to check your RightsRadar account right now.';
      }
    }
  }
  function pathsFor(text){if(typeof window.RightsRadarVerifiedMatches!=='function')return [];return window.RightsRadarVerifiedMatches(text,j.value).map(x=>x.url).slice(0,3);}
  form.addEventListener('submit',async e=>{e.preventDefault();const text=input.value.trim();if(text.length<2)return;const paths=pathsFor(text);bubble('user',text);input.value='';input.disabled=true;form.querySelector('button').disabled=true;status.textContent='Checking verified RightsRadar material and preparing an answer…';try{const d=await request('/api/ai-assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text,jurisdiction:j.value,guidePaths:paths,history})});bubble('assistant',d.answer);history=[...history,{role:'user',content:text},{role:'assistant',content:d.answer}].slice(-8);updateMeter(d);status.textContent=d.sources?.length?`Answer grounded in verified RightsRadar material and ${d.sources.length} official source link${d.sources.length===1?'':'s'}.`:'Answer grounded in verified RightsRadar material.';}catch(err){bubble('assistant',err.message);status.textContent=err.code==='NO_VERIFIED_CONTEXT'?'Not enough verified material yet. Use the verified search below to browse what RightsRadar currently covers.':err.message;}finally{input.disabled=false;form.querySelector('button').disabled=false;input.focus();}});
  document.querySelector('#aiNewChat')?.addEventListener('click',()=>{history=[];log.innerHTML='<div class="ai-bubble assistant"><strong>RightsRadar AI</strong><div>New conversation started. Ask in any language. I will only answer legal questions where RightsRadar has matched verified material.</div></div>';status.textContent='Conversation cleared on this device.';});
  state();
})();

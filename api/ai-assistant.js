const { neon } = require('@neondatabase/serverless');
const { getSessionUser, parseCookies, COOKIE_NAME } = require('./auth');

const JURISDICTIONS = new Set(['scotland','england-wales','northern-ireland']);
const LABELS = {scotland:'Scotland','england-wales':'England & Wales','northern-ireland':'Northern Ireland'};
const FREE_LIMIT = 5;
const PLUS_LIMIT = 100;

function send(res,status,body){res.status(status).json(body);}
function dbUrl(){return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || '';}
function body(req){if(!req.body)return {};if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return {}}}return req.body;}
function origin(req){const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();return host?`${proto}://${host}`:'https://rightsradaruk.vercel.app';}
function sameOrigin(req){return !req.headers.origin || req.headers.origin===origin(req);}
async function user(sql,req){const token=parseCookies(req.headers.cookie||'')[COOKIE_NAME]||'';return getSessionUser(sql,token);}
function withTimeout(promise,ms,label){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{const e=new Error(label||'Request timed out');e.code='TIMEOUT';reject(e);},ms);});
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}

async function entitlement(sql,u){
  const rows=await sql`SELECT plan,status,current_period_end AS "currentPeriodEnd" FROM ai_assistant_entitlements WHERE user_id=${u.id} LIMIT 1`;
  const e=rows[0]||{}; const plus=e.plan==='plus' && ['active','trialing'].includes(String(e.status||'')) && (!e.currentPeriodEnd || new Date(e.currentPeriodEnd).getTime()>Date.now());
  return {plan:plus?'plus':'free',limit:plus?PLUS_LIMIT:FREE_LIMIT};
}
async function usage(sql,u){const rows=await sql`SELECT message_count AS count FROM ai_assistant_usage WHERE user_id=${u.id} AND period_start=date_trunc('month',CURRENT_DATE)::date LIMIT 1`;return Number(rows[0]?.count||0);}

function stripHtml(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
function sourceLinks(html){const out=[];const re=/<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;while((m=re.exec(html))&&out.length<8){const url=m[1];const title=stripHtml(m[2]);if(/gov\.uk|gov\.scot|police\.uk|police\.scotland|scotland\.police|psni\.police|judiciary|courts|legislation\.gov\.uk|parliament\.uk|copfs\.gov\.uk|pirc\.scot|policeombudsman\.org/i.test(url))out.push({title:title||url,url});}return out;}
async function guideContext(req,paths){
  const contexts=[]; const sources=[];
  for(const raw of paths.slice(0,3)){
    const path=String(raw||''); if(!/^\/guides\/[a-z0-9-]+\.html$/i.test(path))continue;
    try{const r=await fetch(`${origin(req)}${path}`,{headers:{'user-agent':'RightsRadarAI/1.0'}});if(!r.ok)continue;const html=await r.text();const title=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||path;const text=stripHtml((html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)||[])[1]||html).slice(0,6500);if(text)contexts.push(`VERIFIED RIGHTSRADAR GUIDE: ${stripHtml(title)}\nURL: ${path}\n${text}`);for(const s of sourceLinks(html)){if(!sources.some(x=>x.url===s.url))sources.push(s);}}
    catch{}
  }
  return {contexts,sources};
}
function responseText(data){if(typeof data.output_text==='string')return data.output_text.trim();const chunks=[];for(const item of data.output||[]){for(const c of item.content||[]){if(c.type==='output_text'&&c.text)chunks.push(c.text);}}return chunks.join('\n').trim();}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Method not allowed.'});}
  const conn=dbUrl(); if(!conn)return send(res,503,{error:'Assistant account database is not connected.',code:'DB_NOT_CONFIGURED'});
  const sql=neon(conn);
  try{
    // The AI usage/entitlement tables were created when the feature was deployed.
    // Do not run CREATE TABLE statements on every status request: a DDL lock can leave
    // the browser sitting on “Checking account…” indefinitely.
    const u=await withTimeout(user(sql,req),8000,'Account lookup timed out').catch(error=>{if(error?.code==='TIMEOUT')throw error;return null;});
    if(!u)return send(res,401,{error:'Sign in to use conversational RightsRadar AI.',code:'SIGN_IN_REQUIRED'});
    const [ent,used]=await withTimeout(Promise.all([entitlement(sql,u),usage(sql,u)]),8000,'Assistant account status timed out');
    if(req.method==='GET')return send(res,200,{ok:true,user:{name:u.name},plan:ent.plan,used,limit:ent.limit,remaining:Math.max(0,ent.limit-used),aiConfigured:Boolean(process.env.OPENAI_API_KEY)});
    if(!sameOrigin(req))return send(res,403,{error:'Invalid request origin.'});
    if(used>=ent.limit)return send(res,402,{error:ent.plan==='free'?'Your 5 free AI questions for this month are used. RightsRadar Plus will increase the allowance to 100 messages per month.':'Your monthly AI message allowance is used.',code:'LIMIT_REACHED',plan:ent.plan,used,limit:ent.limit});
    if(!process.env.OPENAI_API_KEY)return send(res,503,{error:'Conversational AI is installed but the secure AI key has not been connected yet.',code:'AI_NOT_CONFIGURED'});
    const b=body(req); const message=String(b.message||'').trim(); const jurisdiction=JURISDICTIONS.has(b.jurisdiction)?b.jurisdiction:'scotland';
    if(message.length<2||message.length>3000)return send(res,400,{error:'Message must be between 2 and 3000 characters.'});
    const history=Array.isArray(b.history)?b.history.slice(-8).filter(x=>['user','assistant'].includes(x?.role)&&typeof x?.content==='string').map(x=>({role:x.role,content:x.content.slice(0,3000)})):[];
    const paths=Array.isArray(b.guidePaths)?b.guidePaths:[]; const grounded=await guideContext(req,paths);
    if(!grounded.contexts.length)return send(res,422,{error:'I could not find enough verified RightsRadar material for that question yet. Use the verified guide results below or Help Now.',code:'NO_VERIFIED_CONTEXT'});
    const instructions=`You are RightsRadar AI, a multilingual UK legal-information assistant. You are NOT a solicitor, barrister, advocate, law firm or representative. The applicable legal system for this conversation is ${LABELS[jurisdiction]}. Reply in the same language as the user's latest message unless they ask for another language. Base legal claims ONLY on the VERIFIED RIGHTSRADAR GUIDE material supplied below. Never invent cases, statutes, deadlines, powers, citations or facts. If the material does not answer something, say you do not have enough verified information. Distinguish general legal information from personalised legal advice. Do not predict outcomes. For arrest, liberty, active proceedings, deadlines, immigration, family matters, serious housing loss or other high-stakes case-specific issues, recommend a qualified legal professional or appropriate official service. Do not ask for names, addresses, case numbers, medical records or other unnecessary sensitive data. Keep answers clear and conversational. End with a short 'Sources checked' section naming the supplied RightsRadar guide(s); do not fabricate URLs.\n\n${grounded.contexts.join('\n\n---\n\n')}`;
    const input=[...history,{role:'user',content:message}];
    const ai=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',instructions,input,max_output_tokens:900})});
    const data=await ai.json().catch(()=>({})); if(!ai.ok){console.error('AI provider error',ai.status,data?.error?.type||'');return send(res,502,{error:'The AI assistant is temporarily unavailable. Your verified guide search still works.'});}
    const answer=responseText(data); if(!answer)return send(res,502,{error:'The AI assistant returned no answer. Please use the verified guide results.'});
    const rows=await sql`INSERT INTO ai_assistant_usage(user_id,period_start,message_count) VALUES(${u.id},date_trunc('month',CURRENT_DATE)::date,1) ON CONFLICT(user_id,period_start) DO UPDATE SET message_count=ai_assistant_usage.message_count+1,updated_at=NOW() RETURNING message_count AS count`;
    const nowUsed=Number(rows[0]?.count||used+1);
    return send(res,200,{ok:true,answer,sources:grounded.sources.slice(0,6),plan:ent.plan,used:nowUsed,limit:ent.limit,remaining:Math.max(0,ent.limit-nowUsed)});
  }catch(error){
    console.error('AI assistant request failed',error);
    if(error?.code==='TIMEOUT')return send(res,504,{error:'The account check timed out. Please try again.',code:'ACCOUNT_CHECK_TIMEOUT'});
    return send(res,500,{error:'Unable to use conversational RightsRadar AI right now.',code:'AI_STATUS_FAILED'});
  }
};

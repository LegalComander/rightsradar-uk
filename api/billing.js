const { neon } = require('@neondatabase/serverless');
const { getSessionUser, parseCookies, COOKIE_NAME } = require('./auth');

const DEFAULT_PRICE_ID = 'price_1UFUSRQShPftL8gJSrU4djc5';

function send(res,status,body){res.status(status).json(body);}
function dbUrl(){return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || '';}
function body(req){if(!req.body)return {};if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return {}}}return req.body;}
function origin(req){const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();return host?`${proto}://${host}`:'https://rightsradaruk.vercel.app';}
function sameOrigin(req){return !req.headers.origin || req.headers.origin===origin(req);}
async function currentUser(sql,req){const token=parseCookies(req.headers.cookie||'')[COOKIE_NAME]||'';return getSessionUser(sql,token);}

async function ensureSchema(sql){
  await sql`CREATE TABLE IF NOT EXISTS ai_assistant_entitlements (
    user_id TEXT PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_end TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

function appendForm(params,prefix,value){
  if(value===undefined||value===null)return;
  if(Array.isArray(value)){value.forEach((v,i)=>appendForm(params,`${prefix}[${i}]`,v));return;}
  if(typeof value==='object'){Object.entries(value).forEach(([k,v])=>appendForm(params,prefix?`${prefix}[${k}]`:k,v));return;}
  params.append(prefix,String(value));
}

async function stripe(path,payload={}){
  const key=process.env.STRIPE_SECRET_KEY||'';
  if(!key){const e=new Error('STRIPE_NOT_CONFIGURED');e.status=503;throw e;}
  const form=new URLSearchParams();
  Object.entries(payload).forEach(([k,v])=>appendForm(form,k,v));
  const response=await fetch(`https://api.stripe.com/v1/${path}`,{
    method:'POST',
    headers:{authorization:`Bearer ${key}`,'content-type':'application/x-www-form-urlencoded'},
    body:form.toString()
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const e=new Error(data.error?.message||'Stripe request failed.');e.status=response.status;throw e;}
  return data;
}

async function stripeGet(path,query={}){
  const key=process.env.STRIPE_SECRET_KEY||'';
  if(!key){const e=new Error('STRIPE_NOT_CONFIGURED');e.status=503;throw e;}
  const q=new URLSearchParams();Object.entries(query).forEach(([k,v])=>appendForm(q,k,v));
  const response=await fetch(`https://api.stripe.com/v1/${path}${q.size?`?${q}`:''}`,{headers:{authorization:`Bearer ${key}`}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const e=new Error(data.error?.message||'Stripe request failed.');e.status=response.status;throw e;}
  return data;
}

function periodEndIso(subscription){
  const t=Number(subscription?.current_period_end||0);
  return t?new Date(t*1000).toISOString():null;
}

async function upsertSubscription(sql,userId,{plan='plus',status='active',customerId=null,subscriptionId=null,currentPeriodEnd=null}={}){
  await sql`INSERT INTO ai_assistant_entitlements(user_id,plan,status,stripe_customer_id,stripe_subscription_id,current_period_end,updated_at)
    VALUES(${userId},${plan},${status},${customerId},${subscriptionId},${currentPeriodEnd},NOW())
    ON CONFLICT(user_id) DO UPDATE SET
      plan=EXCLUDED.plan,status=EXCLUDED.status,
      stripe_customer_id=COALESCE(EXCLUDED.stripe_customer_id,ai_assistant_entitlements.stripe_customer_id),
      stripe_subscription_id=COALESCE(EXCLUDED.stripe_subscription_id,ai_assistant_entitlements.stripe_subscription_id),
      current_period_end=EXCLUDED.current_period_end,updated_at=NOW()`;
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Method not allowed.'});}
  const conn=dbUrl();if(!conn)return send(res,503,{error:'Account database is not connected.'});
  const sql=neon(conn);
  try{
    await ensureSchema(sql);
    const u=await currentUser(sql,req).catch(()=>null);
    if(!u)return send(res,401,{error:'Sign in to manage RightsRadar Plus.',code:'SIGN_IN_REQUIRED'});
    const rows=await sql`SELECT plan,status,stripe_customer_id AS "customerId",stripe_subscription_id AS "subscriptionId",current_period_end AS "currentPeriodEnd" FROM ai_assistant_entitlements WHERE user_id=${u.id} LIMIT 1`;
    const existing=rows[0]||{plan:'free',status:'active',customerId:null,subscriptionId:null,currentPeriodEnd:null};
    if(req.method==='GET')return send(res,200,{ok:true,plan:existing.plan||'free',status:existing.status||'active',currentPeriodEnd:existing.currentPeriodEnd||null,billingConfigured:Boolean(process.env.STRIPE_SECRET_KEY),priceId:process.env.STRIPE_PRICE_ID||DEFAULT_PRICE_ID,testMode:process.env.STRIPE_LIVE_MODE!=='true'});
    if(!sameOrigin(req))return send(res,403,{error:'Invalid request origin.'});
    const b=body(req);const action=String(b.action||'');
    if(action==='checkout'){
      if(existing.plan==='plus'&&['active','trialing'].includes(String(existing.status||'')))return send(res,409,{error:'RightsRadar Plus is already active on this account.'});
      let customerId=existing.customerId||'';
      if(!customerId){
        const customer=await stripe('customers',{email:u.email||undefined,name:u.name||undefined,metadata:{rightsradar_user_id:u.id}});
        customerId=customer.id;
        await sql`INSERT INTO ai_assistant_entitlements(user_id,plan,status,stripe_customer_id,updated_at) VALUES(${u.id},'free','active',${customerId},NOW()) ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=EXCLUDED.stripe_customer_id,updated_at=NOW()`;
      }
      const session=await stripe('checkout/sessions',{
        mode:'subscription',
        customer:customerId,
        client_reference_id:u.id,
        success_url:`${origin(req)}/assistant.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:`${origin(req)}/assistant.html?checkout=cancelled`,
        allow_promotion_codes:'true',
        line_items:[{price:process.env.STRIPE_PRICE_ID||DEFAULT_PRICE_ID,quantity:1}],
        metadata:{rightsradar_user_id:u.id},
        subscription_data:{metadata:{rightsradar_user_id:u.id}}
      });
      return send(res,200,{ok:true,url:session.url});
    }
    if(action==='portal'){
      if(!existing.customerId)return send(res,400,{error:'No Stripe customer is connected to this account yet.'});
      const portal=await stripe('billing_portal/sessions',{customer:existing.customerId,return_url:`${origin(req)}/assistant.html`});
      return send(res,200,{ok:true,url:portal.url});
    }
    if(action==='sync'){
      const sessionId=String(b.sessionId||'').trim();
      if(!/^cs_[A-Za-z0-9_]+$/.test(sessionId))return send(res,400,{error:'Invalid Checkout session.'});
      const session=await stripeGet(`checkout/sessions/${encodeURIComponent(sessionId)}`,{expand:['subscription']});
      if(String(session.client_reference_id||session.metadata?.rightsradar_user_id||'')!==String(u.id))return send(res,403,{error:'Checkout session does not belong to this account.'});
      const subscription=typeof session.subscription==='object'?session.subscription:null;
      if(!subscription)return send(res,409,{error:'Subscription is not ready yet. Please refresh in a moment.'});
      const active=['active','trialing'].includes(String(subscription.status||''));
      await upsertSubscription(sql,u.id,{plan:'plus',status:String(subscription.status||'incomplete'),customerId:String(session.customer||existing.customerId||''),subscriptionId:String(subscription.id||''),currentPeriodEnd:periodEndIso(subscription)});
      return send(res,200,{ok:true,active,status:subscription.status,plan:active?'plus':'free'});
    }
    return send(res,400,{error:'Unknown billing action.'});
  }catch(error){
    if(error.message==='STRIPE_NOT_CONFIGURED')return send(res,503,{error:'Stripe billing is installed but the secure Stripe key has not been connected yet.',code:'BILLING_NOT_CONFIGURED'});
    console.error('billing request failed',error);
    const s=Number(error.status)||500;return send(res,s>=400&&s<500?s:500,{error:s>=400&&s<500?error.message:'Unable to manage billing right now.'});
  }
};

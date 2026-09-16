const { neon } = require('@neondatabase/serverless');

const COOKIE_NAME = 'rr_session';
const MAX_SESSION_AGE = 60 * 60 * 24 * 7;

function send(res, status, body) { res.status(status).json(body); }
function getConnectionString() { return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || ''; }
function getAuthBaseUrl() { return process.env.NEON_AUTH_BASE_URL || process.env.SITE_NEON_AUTH_URL || ''; }
function parseBody(req) { if (!req.body) return {}; if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } } return req.body; }
function parseCookies(header = '') { return Object.fromEntries(header.split(';').map(v => v.trim()).filter(Boolean).map(v => { const i=v.indexOf('='); return i<0?[v,'']:[v.slice(0,i),decodeURIComponent(v.slice(i+1))]; })); }
function setSessionCookie(res, token) { res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_SESSION_AGE}`); }
function clearSessionCookie(res) { res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`); }
function requestOrigin(req) { const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim(); const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim(); return host?`${proto}://${host}`:'https://rightsradaruk.vercel.app'; }
function sameOrigin(req) { const origin=req.headers.origin; return !origin || origin===requestOrigin(req); }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length<=254; }

async function authRequest(req,path,payload){
  const base=String(getAuthBaseUrl()).replace(/\/$/,'');
  if(!base)throw new Error('AUTH_NOT_CONFIGURED');
  const response=await fetch(`${base}${path}`,{method:'POST',headers:{'content-type':'application/json','accept':'application/json','origin':requestOrigin(req),'user-agent':String(req.headers['user-agent']||'RightsRadarUK/1.0')},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.message||data.error?.message||data.error||'Authentication request failed.');error.status=response.status;throw error;}
  return data;
}

async function getSessionUser(sql,token){
  if(!token)return null;
  const rows=await sql`SELECT to_jsonb(s) AS session, to_jsonb(u) AS usr FROM neon_auth.session s JOIN neon_auth."user" u ON u.id = COALESCE(to_jsonb(s)->>'userId', to_jsonb(s)->>'user_id') WHERE to_jsonb(s)->>'token' = ${token} LIMIT 1`;
  if(!rows.length)return null;
  const session=rows[0].session||{}; const expiresAt=session.expiresAt||session.expires_at;
  if(expiresAt&&new Date(expiresAt).getTime()<=Date.now())return null;
  const user=rows[0].usr||{};
  return {id:String(user.id||''),name:String(user.name||'').trim()||String(user.email||'').split('@')[0]||'Member',email:String(user.email||''),emailVerified:Boolean(user.emailVerified??user.email_verified),sessionToken:token};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const connectionString=getConnectionString();
  if(!connectionString)return send(res,503,{error:'Account database is not connected yet.'});
  const sql=neon(connectionString);
  if(req.method==='GET'){
    try{
      const token=parseCookies(req.headers.cookie||'')[COOKIE_NAME]||'';
      const user=await getSessionUser(sql,token);
      return send(res,200,{ok:true,authenticated:Boolean(user),authConfigured:Boolean(getAuthBaseUrl()),authBaseUrl:getAuthBaseUrl(),user:user?{id:user.id,name:user.name,email:user.email,emailVerified:user.emailVerified}:null});
    }catch(error){console.error('auth session check failed',error);return send(res,200,{ok:true,authenticated:false,authConfigured:Boolean(getAuthBaseUrl()),authBaseUrl:getAuthBaseUrl(),user:null});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Method not allowed.'});}
  if(!sameOrigin(req))return send(res,403,{error:'Invalid request origin.'});
  const body=parseBody(req); const action=String(body.action||'');
  try{
    if(action==='sign-up'){
      const name=String(body.name||'').trim(); const email=String(body.email||'').trim().toLowerCase(); const password=String(body.password||'');
      if(name.length<2||name.length>60)return send(res,400,{error:'Enter a display name between 2 and 60 characters.'});
      if(!validEmail(email))return send(res,400,{error:'Enter a valid email address.'});
      if(password.length<8||password.length>128)return send(res,400,{error:'Password must be between 8 and 128 characters.'});
      const result=await authRequest(req,'/sign-up/email',{name,email,password}); const token=result.token||result.session?.token; if(token)setSessionCookie(res,token);
      return send(res,201,{ok:true,authenticated:Boolean(token),user:result.user?{id:result.user.id,name:result.user.name,email:result.user.email}:null,message:token?'Account created and signed in.':'Account created. Check your email if verification is required before signing in.'});
    }
    if(action==='sign-in'){
      const email=String(body.email||'').trim().toLowerCase(); const password=String(body.password||'');
      if(!validEmail(email)||!password)return send(res,400,{error:'Enter your email address and password.'});
      const result=await authRequest(req,'/sign-in/email',{email,password,rememberMe:true}); const token=result.token||result.session?.token;
      if(!token)return send(res,401,{error:'Sign-in did not return a valid session.'}); setSessionCookie(res,token);
      return send(res,200,{ok:true,authenticated:true,user:result.user?{id:result.user.id,name:result.user.name,email:result.user.email}:null,message:'Signed in successfully.'});
    }
    if(action==='request-password-reset'){
      const email=String(body.email||'').trim().toLowerCase();
      if(!validEmail(email))return send(res,400,{error:'Enter a valid email address.'});
      const redirectTo=`${requestOrigin(req)}/reset-password.html`;
      try{await authRequest(req,'/request-password-reset',{email,redirectTo});}catch(error){
        // Do not reveal whether an address exists. Configuration/server errors still get logged.
        if(Number(error.status)>=500||error.message==='AUTH_NOT_CONFIGURED')throw error;
        console.warn('password reset request rejected',error.message);
      }
      return send(res,200,{ok:true,message:'If an account exists for that email, a password reset link will be sent shortly.'});
    }
    if(action==='reset-password'){
      const token=String(body.token||'').trim(); const newPassword=String(body.newPassword||'');
      if(!token||token.length>2048)return send(res,400,{error:'This password reset link is invalid or has expired.'});
      if(newPassword.length<8||newPassword.length>128)return send(res,400,{error:'Password must be between 8 and 128 characters.'});
      await authRequest(req,'/reset-password',{token,newPassword});
      clearSessionCookie(res);
      return send(res,200,{ok:true,message:'Password reset successfully.'});
    }
    if(action==='sign-out'){clearSessionCookie(res);return send(res,200,{ok:true,authenticated:false,message:'Signed out.'});}
    return send(res,400,{error:'Unknown account action.'});
  }catch(error){if(error.message==='AUTH_NOT_CONFIGURED')return send(res,503,{error:'Neon Auth is not connected to this deployment yet.'});console.error('auth action failed',error);const status=Number(error.status)||500;const safeStatus=status>=400&&status<500?status:500;return send(res,safeStatus,{error:safeStatus===500?'Unable to complete the account request right now.':error.message});}
};

module.exports.getSessionUser=getSessionUser;
module.exports.parseCookies=parseCookies;
module.exports.COOKIE_NAME=COOKIE_NAME;
module.exports.getAuthBaseUrl=getAuthBaseUrl;

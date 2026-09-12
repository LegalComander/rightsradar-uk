const { neon } = require('@neondatabase/serverless');
const { getSessionUser, parseCookies, COOKIE_NAME } = require('./auth');

function send(res, status, body) { res.status(status).json(body); }
function getConnectionString() { return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || ''; }
function parseBody(req) { if (!req.body) return {}; if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } } return req.body; }
function requestOrigin(req) { const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim(); const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim(); return host?`${proto}://${host}`:'https://rightsradaruk.vercel.app'; }
function sameOrigin(req) { const origin=req.headers.origin; return !origin || origin===requestOrigin(req); }
function adminEmails(){return String(process.env.COMMUNITY_ADMIN_EMAILS||process.env.COMMUNITY_ADMIN_EMAIL||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);}

async function requireAdmin(sql,req){
  const configured=adminEmails();
  if(!configured.length){const e=new Error('ADMIN_NOT_CONFIGURED');e.status=503;throw e;}
  const token=parseCookies(req.headers.cookie||'')[COOKIE_NAME]||'';
  const user=await getSessionUser(sql,token);
  if(!user||!configured.includes(String(user.email||'').toLowerCase())){const e=new Error('ADMIN_REQUIRED');e.status=403;throw e;}
  return user;
}

async function ensureSchema(sql){
  await sql`CREATE TABLE IF NOT EXISTS community_chat_messages (id BIGSERIAL PRIMARY KEY, author_user_id TEXT NOT NULL, author_name TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS community_chat_reports (id BIGSERIAL PRIMARY KEY, reporter_user_id TEXT NOT NULL, message_id BIGINT NOT NULL REFERENCES community_chat_messages(id) ON DELETE CASCADE, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

async function load(sql){
  const reports=await sql`
    SELECT r.id,r.reason,r.status,r.created_at AS "createdAt",m.id AS "messageId",m.body,m.author_name AS "authorName",m.status AS "messageStatus",m.created_at AS "messageCreatedAt"
    FROM community_chat_reports r JOIN community_chat_messages m ON m.id=r.message_id
    WHERE r.status='open' ORDER BY r.created_at ASC LIMIT 100
  `;
  const messages=await sql`
    SELECT id,author_name AS "authorName",body,status,created_at AS "createdAt"
    FROM community_chat_messages ORDER BY created_at DESC LIMIT 100
  `;
  return {reports,messages};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const connectionString=getConnectionString();
  if(!connectionString)return send(res,503,{error:'Member chat database is not connected.'});
  const sql=neon(connectionString);
  try{
    await ensureSchema(sql);
    const admin=await requireAdmin(sql,req);
    if(req.method==='GET')return send(res,200,{ok:true,admin:{name:admin.name,email:admin.email},...(await load(sql))});
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Method not allowed.'});}
    if(!sameOrigin(req))return send(res,403,{error:'Invalid request origin.'});
    const body=parseBody(req); const action=String(body.action||''); const id=Number(body.id);
    if(!Number.isInteger(id)||id<1)return send(res,400,{error:'Invalid item.'});
    if(action==='hide-message'){await sql`UPDATE community_chat_messages SET status='hidden',updated_at=NOW() WHERE id=${id}`;return send(res,200,{ok:true,message:'Chat message hidden.'});}
    if(action==='restore-message'){await sql`UPDATE community_chat_messages SET status='published',updated_at=NOW() WHERE id=${id}`;return send(res,200,{ok:true,message:'Chat message restored.'});}
    if(action==='resolve-report'){await sql`UPDATE community_chat_reports SET status='resolved' WHERE id=${id}`;return send(res,200,{ok:true,message:'Chat report resolved.'});}
    if(action==='dismiss-report'){await sql`UPDATE community_chat_reports SET status='dismissed' WHERE id=${id}`;return send(res,200,{ok:true,message:'Chat report dismissed.'});}
    return send(res,400,{error:'Unknown moderation action.'});
  }catch(error){
    if(error.message==='ADMIN_NOT_CONFIGURED')return send(res,503,{error:'Community admin access is not configured yet.'});
    if(error.message==='ADMIN_REQUIRED')return send(res,403,{error:'Administrator access required.'});
    console.error('chat admin request failed',error);return send(res,500,{error:'Unable to load or update chat moderation data.'});
  }
};

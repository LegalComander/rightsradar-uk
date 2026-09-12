const { neon } = require('@neondatabase/serverless');
const { getSessionUser, parseCookies, COOKIE_NAME, getAuthBaseUrl } = require('./auth');

const CATEGORIES = new Set(['general','police','housing','benefits','protest','courts','driving','employment','consumer']);
const JURISDICTIONS = new Set(['scotland','england-wales','northern-ireland','uk-wide']);

function send(res, status, body) { res.status(status).json(body); }
function getConnectionString() { return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || ''; }
function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}
function requestOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : 'https://rightsradaruk.vercel.app';
}
function sameOrigin(req) { const origin = req.headers.origin; return !origin || origin === requestOrigin(req); }

async function ensureSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS community_threads (
    id BIGSERIAL PRIMARY KEY,
    author_user_id TEXT,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    jurisdiction TEXT NOT NULL DEFAULT 'uk-wide',
    status TEXT NOT NULL DEFAULT 'published',
    is_official BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS community_comments (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
    author_user_id TEXT,
    author_name TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS community_reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_user_id TEXT,
    thread_id BIGINT REFERENCES community_threads(id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES community_comments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT community_report_target CHECK (thread_id IS NOT NULL OR comment_id IS NOT NULL)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS community_thread_follows (
    thread_id BIGINT NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (thread_id,user_id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS community_topic_follows (
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id,topic)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS community_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    url TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS community_threads_created_idx ON community_threads(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS community_comments_thread_idx ON community_comments(thread_id, created_at ASC)`;
  await sql`CREATE INDEX IF NOT EXISTS community_reports_status_idx ON community_reports(status, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS community_notifications_user_idx ON community_notifications(user_id, created_at DESC)`;

  const existing = await sql`SELECT id FROM community_threads LIMIT 1`;
  if (!existing.length) {
    await sql`INSERT INTO community_threads
      (author_name,title,body,category,jurisdiction,is_official)
      VALUES ('RightsRadar UK','Welcome to the RightsRadar Community',
      'This community is for discussing UK legal news and general rights information. Community posts are not verified legal advice. Please do not post private case details, addresses, phone numbers or other sensitive personal information.',
      'general','uk-wide',TRUE)`;
  }
}

async function currentUser(sql, req) {
  const token = parseCookies(req.headers.cookie || '')[COOKIE_NAME] || '';
  return getSessionUser(sql, token);
}

async function loadCommunity(sql) {
  const threads = await sql`
    SELECT t.id,
           t.author_user_id AS "authorUserId",
           t.author_name AS "authorName",
           t.title,t.body,t.category,t.jurisdiction,
           t.is_official AS "isOfficial",
           t.created_at AS "createdAt",
           COUNT(c.id)::int AS "commentCount"
    FROM community_threads t
    LEFT JOIN community_comments c ON c.thread_id=t.id AND c.status='published'
    WHERE t.status='published'
    GROUP BY t.id
    ORDER BY t.is_official DESC,t.created_at DESC
    LIMIT 40
  `;
  const ids=threads.map(t=>Number(t.id)).filter(Number.isFinite);
  let comments=[];
  if(ids.length){
    comments=await sql`
      SELECT c.id,c.thread_id AS "threadId",c.author_user_id AS "authorUserId",
             c.author_name AS "authorName",c.body,c.created_at AS "createdAt"
      FROM community_comments c
      WHERE c.status='published' AND c.thread_id=ANY(${ids}::bigint[])
      ORDER BY c.created_at ASC
      LIMIT 240
    `;
  }
  return {threads,comments};
}

async function notifyTopicFollowers(sql, authorId, threadId, title, category) {
  await sql`
    INSERT INTO community_notifications (user_id,type,title,body,url)
    SELECT f.user_id,'topic','New ' || ${category} || ' discussion',${title},${'/community.html#thread-' + threadId}
    FROM community_topic_follows f
    WHERE f.topic=${category} AND f.user_id<>${authorId}
  `;
}

async function notifyThreadFollowers(sql, actor, thread, threadId) {
  await sql`
    INSERT INTO community_notifications (user_id,type,title,body,url)
    SELECT DISTINCT x.user_id,'reply','New reply in a discussion you follow',${actor.name + ' replied to “' + thread.title + '”.'},${'/community.html#thread-' + threadId}
    FROM (
      SELECT ${thread.author_user_id}::text AS user_id
      UNION
      SELECT f.user_id FROM community_thread_follows f WHERE f.thread_id=${threadId}
    ) x
    WHERE x.user_id IS NOT NULL AND x.user_id<>${actor.id}
  `;
}

module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const connectionString=getConnectionString();
  if(!connectionString)return send(res,503,{error:'Community database is not connected yet.'});
  try{
    const sql=neon(connectionString);
    await ensureSchema(sql);

    if(req.method==='GET'){
      const user=await currentUser(sql,req).catch(()=>null);
      const data=await loadCommunity(sql);
      return send(res,200,{
        ok:true,
        postingEnabled:Boolean(user),
        authConfigured:Boolean(typeof getAuthBaseUrl==='function' ? getAuthBaseUrl() : (process.env.NEON_AUTH_BASE_URL || process.env.SITE_NEON_AUTH_URL)),
        user:user?{id:user.id,name:user.name,email:user.email}:null,
        ...data,
        note:'Community content is user-generated unless marked RightsRadar verified.'
      });
    }

    if(req.method!=='POST'){
      res.setHeader('Allow','GET, POST');
      return send(res,405,{error:'Method not allowed.'});
    }
    if(!sameOrigin(req))return send(res,403,{error:'Invalid request origin.'});

    const user=await currentUser(sql,req);
    if(!user)return send(res,401,{error:'Sign in to post or report community content.'});
    const body=parseBody(req);
    const action=String(body.action||'');

    if(action==='create-thread'){
      const title=String(body.title||'').trim();
      const text=String(body.body||'').trim();
      const category=String(body.category||'general');
      const jurisdiction=String(body.jurisdiction||'uk-wide');
      if(title.length<5||title.length>140)return send(res,400,{error:'Title must be between 5 and 140 characters.'});
      if(text.length<10||text.length>4000)return send(res,400,{error:'Post must be between 10 and 4,000 characters.'});
      if(!CATEGORIES.has(category))return send(res,400,{error:'Choose a valid category.'});
      if(!JURISDICTIONS.has(jurisdiction))return send(res,400,{error:'Choose a valid jurisdiction.'});
      const recent=await sql`SELECT created_at FROM community_threads WHERE author_user_id=${user.id} ORDER BY created_at DESC LIMIT 1`;
      if(recent.length&&Date.now()-new Date(recent[0].created_at).getTime()<30000)return send(res,429,{error:'Please wait a little before starting another conversation.'});
      const inserted=await sql`INSERT INTO community_threads (author_user_id,author_name,title,body,category,jurisdiction)
        VALUES (${user.id},${user.name},${title},${text},${category},${jurisdiction}) RETURNING id`;
      const id=Number(inserted[0]?.id);
      if(id){
        await sql`INSERT INTO community_thread_follows (thread_id,user_id) VALUES (${id},${user.id}) ON CONFLICT DO NOTHING`;
        await notifyTopicFollowers(sql,user.id,id,title,category);
      }
      return send(res,201,{ok:true,id,message:'Conversation posted.'});
    }

    if(action==='create-comment'){
      const threadId=Number(body.threadId);
      const text=String(body.body||'').trim();
      if(!Number.isInteger(threadId)||threadId<1)return send(res,400,{error:'Invalid conversation.'});
      if(text.length<2||text.length>2000)return send(res,400,{error:'Comment must be between 2 and 2,000 characters.'});
      const target=await sql`SELECT id,author_user_id,title FROM community_threads WHERE id=${threadId} AND status='published' LIMIT 1`;
      if(!target.length)return send(res,404,{error:'Conversation not found.'});
      const recent=await sql`SELECT created_at FROM community_comments WHERE author_user_id=${user.id} ORDER BY created_at DESC LIMIT 1`;
      if(recent.length&&Date.now()-new Date(recent[0].created_at).getTime()<7000)return send(res,429,{error:'Please wait a few seconds before commenting again.'});
      await sql`INSERT INTO community_comments (thread_id,author_user_id,author_name,body) VALUES (${threadId},${user.id},${user.name},${text})`;
      await sql`INSERT INTO community_thread_follows (thread_id,user_id) VALUES (${threadId},${user.id}) ON CONFLICT DO NOTHING`;
      await notifyThreadFollowers(sql,user,target[0],threadId);
      return send(res,201,{ok:true,message:'Comment posted.'});
    }

    if(action==='report'){
      const threadId=body.threadId?Number(body.threadId):null;
      const commentId=body.commentId?Number(body.commentId):null;
      const reason=String(body.reason||'').trim();
      if((!threadId&&!commentId)||reason.length<3||reason.length>500)return send(res,400,{error:'Choose content to report and give a short reason.'});
      const duplicate=await sql`SELECT id FROM community_reports WHERE reporter_user_id=${user.id}
        AND COALESCE(thread_id,0)=COALESCE(${threadId},0)
        AND COALESCE(comment_id,0)=COALESCE(${commentId},0)
        AND status='open' LIMIT 1`;
      if(!duplicate.length)await sql`INSERT INTO community_reports (reporter_user_id,thread_id,comment_id,reason) VALUES (${user.id},${threadId},${commentId},${reason})`;
      return send(res,201,{ok:true,message:'Report received for moderation.'});
    }

    return send(res,400,{error:'Unknown community action.'});
  }catch(error){
    console.error('community request failed',error);
    return send(res,500,{error:'Unable to complete the community request right now.'});
  }
};

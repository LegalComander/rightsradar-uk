const { neon } = require('@neondatabase/serverless');
const { getSessionUser, parseCookies, COOKIE_NAME } = require('./auth');

function send(res,status,body){res.status(status).json(body);}
function getConnectionString(){return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || '';}
async function currentUser(sql,req){const token=parseCookies(req.headers.cookie||'')[COOKIE_NAME]||'';return getSessionUser(sql,token);}

async function ensureSchema(sql){
  await sql`CREATE TABLE IF NOT EXISTS community_profiles (
    user_id TEXT PRIMARY KEY,
    preferred_jurisdiction TEXT NOT NULL DEFAULT 'uk-wide',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS community_helpful (
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
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'Method not allowed.'});}
  const connectionString=getConnectionString();
  if(!connectionString)return send(res,503,{error:'Community database is not connected.'});
  const sql=neon(connectionString);
  try{
    await ensureSchema(sql);
    const viewer=await currentUser(sql,req).catch(()=>null);
    const targetId=String(req.query?.u || viewer?.id || '').trim();
    if(!targetId)return send(res,400,{error:'Choose a member profile.'});

    const rows=await sql`SELECT to_jsonb(u) AS usr FROM neon_auth."user" u WHERE u.id=${targetId} LIMIT 1`;
    if(!rows.length)return send(res,404,{error:'Member not found.'});
    const raw=rows[0].usr||{};
    const name=String(raw.name||'').trim() || 'RightsRadar member';
    const joinedAt=raw.createdAt || raw.created_at || null;
    const profileRows=await sql`SELECT preferred_jurisdiction AS "preferredJurisdiction" FROM community_profiles WHERE user_id=${targetId} LIMIT 1`;
    const preferredJurisdiction=profileRows[0]?.preferredJurisdiction || 'uk-wide';

    const statsRows=await sql`
      SELECT
        (SELECT COUNT(*)::int FROM community_threads WHERE author_user_id=${targetId} AND status='published' AND is_official=FALSE) AS "threadCount",
        (SELECT COUNT(*)::int FROM community_comments WHERE author_user_id=${targetId} AND status='published') AS "commentCount",
        (SELECT COUNT(*)::int FROM community_helpful h JOIN community_threads t ON t.id=h.thread_id WHERE t.author_user_id=${targetId}) AS "helpfulReceived"
    `;
    const recentThreads=await sql`
      SELECT id,title,category,jurisdiction,created_at AS "createdAt",
             (SELECT COUNT(*)::int FROM community_comments c WHERE c.thread_id=community_threads.id AND c.status='published') AS "commentCount"
      FROM community_threads
      WHERE author_user_id=${targetId} AND status='published' AND is_official=FALSE
      ORDER BY created_at DESC
      LIMIT 10
    `;
    let followedTopics=[];
    if(viewer && viewer.id===targetId){
      followedTopics=(await sql`SELECT topic FROM community_topic_follows WHERE user_id=${targetId} ORDER BY topic`).map(r=>r.topic);
    }

    return send(res,200,{
      ok:true,
      isSelf:Boolean(viewer && viewer.id===targetId),
      member:{id:targetId,name,joinedAt,preferredJurisdiction},
      stats:statsRows[0]||{threadCount:0,commentCount:0,helpfulReceived:0},
      recentThreads,
      followedTopics
    });
  }catch(error){
    console.error('member profile request failed',error);
    return send(res,500,{error:'Unable to load this member profile right now.'});
  }
};

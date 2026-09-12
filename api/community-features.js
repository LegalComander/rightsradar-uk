const { neon } = require('@neondatabase/serverless');
const { getSessionUser, parseCookies, COOKIE_NAME } = require('./auth');

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

async function currentUser(sql, req) {
  const token = parseCookies(req.headers.cookie || '')[COOKIE_NAME] || '';
  return getSessionUser(sql, token);
}

async function ensureFeatureSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS community_helpful (
    thread_id BIGINT NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS community_thread_follows (
    thread_id BIGINT NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS community_topic_follows (
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, topic)
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
  await sql`CREATE TABLE IF NOT EXISTS community_profiles (
    user_id TEXT PRIMARY KEY,
    preferred_jurisdiction TEXT NOT NULL DEFAULT 'uk-wide',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS community_notifications_user_idx ON community_notifications(user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS community_topic_follows_topic_idx ON community_topic_follows(topic)`;
}

function parseThreadIds(raw) {
  return String(raw || '').split(',').map(v => Number(v)).filter(v => Number.isInteger(v) && v > 0).slice(0, 50);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const connectionString = getConnectionString();
  if (!connectionString) return send(res, 503, { error: 'Community database is not connected.' });
  const sql = neon(connectionString);

  try {
    await ensureFeatureSchema(sql);
    const user = await currentUser(sql, req).catch(() => null);

    if (req.method === 'GET') {
      const ids = parseThreadIds(req.query?.threadIds);
      let threadStats = [];
      if (ids.length) {
        const userId = user?.id || '';
        threadStats = await sql`
          SELECT t.id,
                 t.author_user_id AS "authorUserId",
                 (SELECT COUNT(*)::int FROM community_helpful h WHERE h.thread_id=t.id) AS "helpfulCount",
                 (SELECT COUNT(*)::int FROM community_thread_follows f WHERE f.thread_id=t.id) AS "followerCount",
                 EXISTS(SELECT 1 FROM community_helpful h2 WHERE h2.thread_id=t.id AND h2.user_id=${userId}) AS "helpfulByMe",
                 EXISTS(SELECT 1 FROM community_thread_follows f2 WHERE f2.thread_id=t.id AND f2.user_id=${userId}) AS "followedByMe"
          FROM community_threads t
          WHERE t.id = ANY(${ids}::bigint[])
        `;
      }

      let topicFollows = [];
      let notifications = [];
      let unreadCount = 0;
      let profile = null;
      if (user) {
        topicFollows = (await sql`SELECT topic FROM community_topic_follows WHERE user_id=${user.id} ORDER BY topic`).map(r => r.topic);
        notifications = await sql`
          SELECT id, type, title, body, url, read_at AS "readAt", created_at AS "createdAt"
          FROM community_notifications
          WHERE user_id=${user.id}
          ORDER BY created_at DESC
          LIMIT 20
        `;
        const unread = await sql`SELECT COUNT(*)::int AS count FROM community_notifications WHERE user_id=${user.id} AND read_at IS NULL`;
        unreadCount = unread[0]?.count || 0;
        const rows = await sql`SELECT preferred_jurisdiction AS "preferredJurisdiction" FROM community_profiles WHERE user_id=${user.id} LIMIT 1`;
        profile = rows[0] || { preferredJurisdiction: 'uk-wide' };
      }

      return send(res, 200, {
        ok: true,
        user: user ? { id: user.id, name: user.name } : null,
        threadStats,
        topicFollows,
        notifications,
        unreadCount,
        profile
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return send(res, 405, { error: 'Method not allowed.' });
    }
    if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' });
    if (!user) return send(res, 401, { error: 'Sign in to use member features.' });

    const body = parseBody(req);
    const action = String(body.action || '');

    if (action === 'toggle-helpful') {
      const threadId = Number(body.threadId);
      if (!Number.isInteger(threadId) || threadId < 1) return send(res, 400, { error: 'Invalid conversation.' });
      const thread = await sql`SELECT id, author_user_id, title FROM community_threads WHERE id=${threadId} AND status='published' LIMIT 1`;
      if (!thread.length) return send(res, 404, { error: 'Conversation not found.' });
      const removed = await sql`DELETE FROM community_helpful WHERE thread_id=${threadId} AND user_id=${user.id} RETURNING thread_id`;
      let active = false;
      if (!removed.length) {
        await sql`INSERT INTO community_helpful (thread_id, user_id) VALUES (${threadId}, ${user.id}) ON CONFLICT DO NOTHING`;
        active = true;
        const authorId = thread[0].author_user_id;
        if (authorId && authorId !== user.id) {
          await sql`INSERT INTO community_notifications (user_id,type,title,body,url)
                    VALUES (${authorId},'helpful','Someone found your discussion helpful',${user.name + ' marked your discussion as helpful.'},${'/community.html#thread-' + threadId})`;
        }
      }
      const count = await sql`SELECT COUNT(*)::int AS count FROM community_helpful WHERE thread_id=${threadId}`;
      return send(res, 200, { ok: true, active, count: count[0]?.count || 0 });
    }

    if (action === 'toggle-thread-follow') {
      const threadId = Number(body.threadId);
      if (!Number.isInteger(threadId) || threadId < 1) return send(res, 400, { error: 'Invalid conversation.' });
      const target = await sql`SELECT id FROM community_threads WHERE id=${threadId} AND status='published' LIMIT 1`;
      if (!target.length) return send(res, 404, { error: 'Conversation not found.' });
      const removed = await sql`DELETE FROM community_thread_follows WHERE thread_id=${threadId} AND user_id=${user.id} RETURNING thread_id`;
      const active = !removed.length;
      if (active) await sql`INSERT INTO community_thread_follows (thread_id,user_id) VALUES (${threadId},${user.id}) ON CONFLICT DO NOTHING`;
      const count = await sql`SELECT COUNT(*)::int AS count FROM community_thread_follows WHERE thread_id=${threadId}`;
      return send(res, 200, { ok: true, active, count: count[0]?.count || 0 });
    }

    if (action === 'toggle-topic-follow') {
      const topic = String(body.topic || '');
      if (!CATEGORIES.has(topic)) return send(res, 400, { error: 'Invalid topic.' });
      const removed = await sql`DELETE FROM community_topic_follows WHERE user_id=${user.id} AND topic=${topic} RETURNING topic`;
      const active = !removed.length;
      if (active) await sql`INSERT INTO community_topic_follows (user_id,topic) VALUES (${user.id},${topic}) ON CONFLICT DO NOTHING`;
      return send(res, 200, { ok: true, active, topic });
    }

    if (action === 'mark-notifications-read') {
      const id = body.id ? Number(body.id) : null;
      if (id && Number.isInteger(id) && id > 0) await sql`UPDATE community_notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=${id} AND user_id=${user.id}`;
      else await sql`UPDATE community_notifications SET read_at=COALESCE(read_at,NOW()) WHERE user_id=${user.id} AND read_at IS NULL`;
      return send(res, 200, { ok: true });
    }

    if (action === 'update-profile') {
      const jurisdiction = String(body.preferredJurisdiction || 'uk-wide');
      if (!JURISDICTIONS.has(jurisdiction)) return send(res, 400, { error: 'Choose a valid jurisdiction.' });
      await sql`INSERT INTO community_profiles (user_id,preferred_jurisdiction)
                VALUES (${user.id},${jurisdiction})
                ON CONFLICT (user_id) DO UPDATE SET preferred_jurisdiction=EXCLUDED.preferred_jurisdiction, updated_at=NOW()`;
      return send(res, 200, { ok: true, preferredJurisdiction: jurisdiction, message: 'Profile updated.' });
    }

    return send(res, 400, { error: 'Unknown member action.' });
  } catch (error) {
    console.error('community features request failed', error);
    return send(res, 500, { error: 'Unable to complete the member request right now.' });
  }
};

module.exports.ensureFeatureSchema = ensureFeatureSchema;

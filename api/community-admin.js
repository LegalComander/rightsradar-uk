const { neon } = require('@neondatabase/serverless');
const { getSessionUser, parseCookies, COOKIE_NAME } = require('./auth');

function send(res, status, body) {
  res.status(status).json(body);
}

function getConnectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || '';
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function requestOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : 'https://rightsradaruk.vercel.app';
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || origin === requestOrigin(req);
}

function adminEmails() {
  return String(process.env.COMMUNITY_ADMIN_EMAILS || process.env.COMMUNITY_ADMIN_EMAIL || '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(sql, req) {
  const configured = adminEmails();
  if (!configured.length) {
    const error = new Error('ADMIN_NOT_CONFIGURED');
    error.status = 503;
    throw error;
  }
  const token = parseCookies(req.headers.cookie || '')[COOKIE_NAME] || '';
  const user = await getSessionUser(sql, token);
  if (!user || !configured.includes(String(user.email || '').toLowerCase())) {
    const error = new Error('ADMIN_REQUIRED');
    error.status = 403;
    throw error;
  }
  return user;
}

async function loadQueue(sql) {
  const reports = await sql`
    SELECT
      r.id,
      r.reason,
      r.status,
      r.created_at AS "createdAt",
      r.thread_id AS "threadId",
      r.comment_id AS "commentId",
      t.title AS "threadTitle",
      t.body AS "threadBody",
      t.author_name AS "threadAuthor",
      t.status AS "threadStatus",
      c.body AS "commentBody",
      c.author_name AS "commentAuthor",
      c.status AS "commentStatus",
      c.thread_id AS "commentThreadId"
    FROM community_reports r
    LEFT JOIN community_threads t ON t.id = r.thread_id
    LEFT JOIN community_comments c ON c.id = r.comment_id
    WHERE r.status = 'open'
    ORDER BY r.created_at ASC
    LIMIT 100
  `;

  const recentThreads = await sql`
    SELECT id, author_name AS "authorName", title, body, status, category, jurisdiction,
           created_at AS "createdAt"
    FROM community_threads
    WHERE is_official = FALSE
    ORDER BY created_at DESC
    LIMIT 40
  `;

  const recentComments = await sql`
    SELECT c.id, c.thread_id AS "threadId", c.author_name AS "authorName", c.body, c.status,
           c.created_at AS "createdAt", t.title AS "threadTitle"
    FROM community_comments c
    JOIN community_threads t ON t.id = c.thread_id
    ORDER BY c.created_at DESC
    LIMIT 60
  `;

  return { reports, recentThreads, recentComments };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const connectionString = getConnectionString();
  if (!connectionString) return send(res, 503, { error: 'Community database is not connected.' });
  const sql = neon(connectionString);

  try {
    const admin = await requireAdmin(sql, req);

    if (req.method === 'GET') {
      const data = await loadQueue(sql);
      return send(res, 200, {
        ok: true,
        admin: { name: admin.name, email: admin.email },
        ...data
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return send(res, 405, { error: 'Method not allowed.' });
    }
    if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' });

    const body = parseBody(req);
    const action = String(body.action || '');
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return send(res, 400, { error: 'Invalid item.' });

    if (action === 'hide-thread') {
      await sql`UPDATE community_threads SET status='hidden', updated_at=NOW() WHERE id=${id} AND is_official=FALSE`;
      return send(res, 200, { ok: true, message: 'Conversation hidden.' });
    }
    if (action === 'restore-thread') {
      await sql`UPDATE community_threads SET status='published', updated_at=NOW() WHERE id=${id} AND is_official=FALSE`;
      return send(res, 200, { ok: true, message: 'Conversation restored.' });
    }
    if (action === 'hide-comment') {
      await sql`UPDATE community_comments SET status='hidden', updated_at=NOW() WHERE id=${id}`;
      return send(res, 200, { ok: true, message: 'Comment hidden.' });
    }
    if (action === 'restore-comment') {
      await sql`UPDATE community_comments SET status='published', updated_at=NOW() WHERE id=${id}`;
      return send(res, 200, { ok: true, message: 'Comment restored.' });
    }
    if (action === 'resolve-report') {
      await sql`UPDATE community_reports SET status='resolved' WHERE id=${id}`;
      return send(res, 200, { ok: true, message: 'Report resolved.' });
    }
    if (action === 'dismiss-report') {
      await sql`UPDATE community_reports SET status='dismissed' WHERE id=${id}`;
      return send(res, 200, { ok: true, message: 'Report dismissed.' });
    }

    return send(res, 400, { error: 'Unknown moderation action.' });
  } catch (error) {
    if (error.message === 'ADMIN_NOT_CONFIGURED') {
      return send(res, 503, { error: 'Community admin access is not configured yet.' });
    }
    if (error.message === 'ADMIN_REQUIRED') {
      return send(res, 403, { error: 'Administrator access required.' });
    }
    console.error('community admin request failed', error);
    return send(res, 500, { error: 'Unable to load or update moderation data.' });
  }
};

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
    .split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS community_chat_messages (
      id BIGSERIAL PRIMARY KEY,
      author_user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS community_chat_reports (
      id BIGSERIAL PRIMARY KEY,
      reporter_user_id TEXT NOT NULL,
      message_id BIGINT NOT NULL REFERENCES community_chat_messages(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS community_chat_created_idx ON community_chat_messages(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS community_chat_reports_status_idx ON community_chat_reports(status, created_at DESC)`;
}

async function currentUser(sql, req) {
  const token = parseCookies(req.headers.cookie || '')[COOKIE_NAME] || '';
  return getSessionUser(sql, token);
}

async function requireAdmin(sql, req) {
  const configured = adminEmails();
  if (!configured.length) {
    const error = new Error('ADMIN_NOT_CONFIGURED');
    error.status = 503;
    throw error;
  }
  const user = await currentUser(sql, req);
  if (!user || !configured.includes(String(user.email || '').toLowerCase())) {
    const error = new Error('ADMIN_REQUIRED');
    error.status = 403;
    throw error;
  }
  return user;
}

async function loadAdminData(sql) {
  const reports = await sql`
    SELECT r.id, r.reason, r.status, r.created_at AS "createdAt",
           m.id AS "messageId", m.body, m.author_name AS "authorName",
           m.status AS "messageStatus", m.created_at AS "messageCreatedAt"
    FROM community_chat_reports r
    JOIN community_chat_messages m ON m.id=r.message_id
    WHERE r.status='open'
    ORDER BY r.created_at ASC
    LIMIT 100
  `;
  const messages = await sql`
    SELECT id, author_name AS "authorName", body, status, created_at AS "createdAt"
    FROM community_chat_messages
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return { reports, messages };
}

async function handleAdmin(sql, req, res) {
  const admin = await requireAdmin(sql, req);
  if (req.method === 'GET') {
    return send(res, 200, { ok: true, admin: { name: admin.name, email: admin.email }, ...(await loadAdminData(sql)) });
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

  if (action === 'hide-message') {
    await sql`UPDATE community_chat_messages SET status='hidden',updated_at=NOW() WHERE id=${id}`;
    return send(res, 200, { ok: true, message: 'Chat message hidden.' });
  }
  if (action === 'restore-message') {
    await sql`UPDATE community_chat_messages SET status='published',updated_at=NOW() WHERE id=${id}`;
    return send(res, 200, { ok: true, message: 'Chat message restored.' });
  }
  if (action === 'resolve-report') {
    await sql`UPDATE community_chat_reports SET status='resolved' WHERE id=${id}`;
    return send(res, 200, { ok: true, message: 'Chat report resolved.' });
  }
  if (action === 'dismiss-report') {
    await sql`UPDATE community_chat_reports SET status='dismissed' WHERE id=${id}`;
    return send(res, 200, { ok: true, message: 'Chat report dismissed.' });
  }
  return send(res, 400, { error: 'Unknown moderation action.' });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const connectionString = getConnectionString();
  if (!connectionString) return send(res, 503, { error: 'Member chat database is not connected.' });

  try {
    const sql = neon(connectionString);
    await ensureSchema(sql);

    const isAdminRoute = String(req.query?.admin || '') === '1' || String(req.query?.admin || '') === 'true';
    if (isAdminRoute) return await handleAdmin(sql, req, res);

    const user = await currentUser(sql, req);
    if (!user) return send(res, 401, { error: 'Sign in to use member chat.' });

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, author_user_id AS "authorUserId", author_name AS "authorName", body,
               created_at AS "createdAt"
        FROM community_chat_messages
        WHERE status='published'
        ORDER BY created_at DESC
        LIMIT 80
      `;
      rows.reverse();
      return send(res, 200, {
        ok: true,
        user: { id: user.id, name: user.name },
        messages: rows,
        note: 'Member chat is user-generated discussion, not verified legal advice.'
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return send(res, 405, { error: 'Method not allowed.' });
    }
    if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' });

    const body = parseBody(req);
    const action = String(body.action || 'send');

    if (action === 'send') {
      const text = String(body.body || '').trim();
      if (text.length < 1 || text.length > 500) return send(res, 400, { error: 'Chat messages must be between 1 and 500 characters.' });
      const recent = await sql`
        SELECT created_at FROM community_chat_messages
        WHERE author_user_id=${user.id}
        ORDER BY created_at DESC LIMIT 1
      `;
      if (recent.length && Date.now() - new Date(recent[0].created_at).getTime() < 3000) {
        return send(res, 429, { error: 'Please wait a few seconds before sending another message.' });
      }
      const inserted = await sql`
        INSERT INTO community_chat_messages (author_user_id, author_name, body)
        VALUES (${user.id}, ${user.name}, ${text})
        RETURNING id, created_at AS "createdAt"
      `;
      return send(res, 201, { ok: true, id: inserted[0]?.id, createdAt: inserted[0]?.createdAt, message: 'Message sent.' });
    }

    if (action === 'report') {
      const messageId = Number(body.messageId);
      const reason = String(body.reason || '').trim();
      if (!Number.isInteger(messageId) || messageId < 1) return send(res, 400, { error: 'Invalid chat message.' });
      if (reason.length < 3 || reason.length > 300) return send(res, 400, { error: 'Give a short reason for the report.' });
      const target = await sql`SELECT id, author_user_id FROM community_chat_messages WHERE id=${messageId} AND status='published' LIMIT 1`;
      if (!target.length) return send(res, 404, { error: 'Chat message not found.' });
      if (String(target[0].author_user_id) === String(user.id)) return send(res, 400, { error: 'You cannot report your own message.' });
      const duplicate = await sql`
        SELECT id FROM community_chat_reports
        WHERE reporter_user_id=${user.id} AND message_id=${messageId} AND status='open'
        LIMIT 1
      `;
      if (!duplicate.length) {
        await sql`
          INSERT INTO community_chat_reports (reporter_user_id, message_id, reason)
          VALUES (${user.id}, ${messageId}, ${reason})
        `;
      }
      return send(res, 201, { ok: true, message: 'Chat message reported for moderation.' });
    }

    return send(res, 400, { error: 'Unknown chat action.' });
  } catch (error) {
    if (error.message === 'ADMIN_NOT_CONFIGURED') return send(res, 503, { error: 'Community admin access is not configured yet.' });
    if (error.message === 'ADMIN_REQUIRED') return send(res, 403, { error: 'Administrator access required.' });
    console.error('member chat request failed', error);
    return send(res, 500, { error: 'Unable to use member chat right now.' });
  }
};

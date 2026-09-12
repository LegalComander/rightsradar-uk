const { neon } = require('@neondatabase/serverless');

function send(res, status, body) {
  res.status(status).json(body);
}

function getConnectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || '';
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS community_threads (
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
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS community_comments (
      id BIGSERIAL PRIMARY KEY,
      thread_id BIGINT NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
      author_user_id TEXT,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS community_reports (
      id BIGSERIAL PRIMARY KEY,
      reporter_user_id TEXT,
      thread_id BIGINT REFERENCES community_threads(id) ON DELETE CASCADE,
      comment_id BIGINT REFERENCES community_comments(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const existing = await sql`SELECT id FROM community_threads LIMIT 1`;
  if (!existing.length) {
    await sql`
      INSERT INTO community_threads
        (author_name, title, body, category, jurisdiction, is_official)
      VALUES
        ('RightsRadar UK',
         'Welcome to the RightsRadar Community',
         'This community is for discussing UK legal news and general rights information. Community posts are not verified legal advice. Please do not post private case details, addresses, phone numbers or other sensitive personal information.',
         'community', 'uk-wide', TRUE)
    `;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const connectionString = getConnectionString();
  if (!connectionString) {
    return send(res, 503, { error: 'Community database is not connected yet.' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'Posting is disabled until authenticated community accounts are connected.' });
  }

  try {
    const sql = neon(connectionString);
    await ensureSchema(sql);
    const threads = await sql`
      SELECT
        t.id,
        t.author_name AS "authorName",
        t.title,
        t.body,
        t.category,
        t.jurisdiction,
        t.is_official AS "isOfficial",
        t.created_at AS "createdAt",
        COUNT(c.id)::int AS "commentCount"
      FROM community_threads t
      LEFT JOIN community_comments c
        ON c.thread_id = t.id AND c.status = 'published'
      WHERE t.status = 'published'
      GROUP BY t.id
      ORDER BY t.is_official DESC, t.created_at DESC
      LIMIT 30
    `;
    return send(res, 200, {
      ok: true,
      postingEnabled: false,
      authConfigured: Boolean(process.env.NEON_AUTH_BASE_URL),
      threads,
      note: 'Community content is user-generated unless marked RightsRadar verified.'
    });
  } catch (error) {
    console.error('community read failed', error);
    return send(res, 500, { error: 'Unable to load community discussions right now.' });
  }
};

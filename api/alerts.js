const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const ALLOWED_JURISDICTIONS = new Set(['scotland', 'england-wales', 'northern-ireland', 'uk-wide']);
const ALLOWED_TOPICS = new Set([
  'police-powers',
  'protest-law',
  'courts',
  'housing',
  'benefits',
  'driving',
  'employment',
  'consumer-rights'
]);
const ALLOWED_FREQUENCIES = new Set(['weekly', 'important']);

function send(res, status, body) {
  res.status(status).json(body);
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || '';
  return connectionString ? neon(connectionString) : null;
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS law_alert_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      jurisdiction TEXT NOT NULL,
      topics JSONB NOT NULL,
      frequency TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free-beta',
      status TEXT NOT NULL DEFAULT 'registered',
      consent_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS law_alert_subscribers_status_idx ON law_alert_subscribers(status)`;
  await sql`CREATE INDEX IF NOT EXISTS law_alert_subscribers_jurisdiction_idx ON law_alert_subscribers(jurisdiction)`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'GET, POST');

  const sql = getSql();
  if (!sql) {
    return send(res, 503, {
      error: 'Law Alerts database is not connected yet.',
      code: 'ALERTS_DATABASE_NOT_CONFIGURED'
    });
  }

  try {
    await ensureSchema(sql);

    if (req.method === 'GET') {
      await sql`SELECT 1 AS ok`;
      return send(res, 200, { ok: true, database: 'connected', service: 'law-alerts' });
    }

    if (req.method !== 'POST') {
      return send(res, 405, { error: 'Method not allowed.' });
    }

    const body = parseBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const jurisdiction = String(body.jurisdiction || '').trim();
    const frequency = String(body.frequency || 'weekly').trim();
    const topics = Array.isArray(body.topics) ? [...new Set(body.topics.map(String))] : [];
    const consent = body.consent === true;

    if (!validEmail(email)) return send(res, 400, { error: 'Enter a valid email address.' });
    if (!ALLOWED_JURISDICTIONS.has(jurisdiction)) return send(res, 400, { error: 'Choose a valid jurisdiction.' });
    if (!ALLOWED_FREQUENCIES.has(frequency)) return send(res, 400, { error: 'Choose a valid alert frequency.' });
    if (!topics.length || topics.some(topic => !ALLOWED_TOPICS.has(topic))) {
      return send(res, 400, { error: 'Choose at least one valid topic.' });
    }
    if (!consent) return send(res, 400, { error: 'Please confirm that you want RightsRadar UK to store these alert preferences.' });

    const id = crypto.createHash('sha256').update(email).digest('hex');
    const now = new Date().toISOString();
    const topicsJson = JSON.stringify(topics);

    const rows = await sql`
      INSERT INTO law_alert_subscribers
        (id, email, jurisdiction, topics, frequency, plan, status, consent_at, updated_at)
      VALUES
        (${id}, ${email}, ${jurisdiction}, ${topicsJson}::jsonb, ${frequency}, 'free-beta', 'registered', ${now}, ${now})
      ON CONFLICT (email) DO UPDATE SET
        jurisdiction = EXCLUDED.jurisdiction,
        topics = EXCLUDED.topics,
        frequency = EXCLUDED.frequency,
        status = 'registered',
        consent_at = EXCLUDED.consent_at,
        updated_at = EXCLUDED.updated_at
      RETURNING plan, status
    `;

    return send(res, 201, {
      ok: true,
      message: 'Your Law Alerts preferences have been saved for the beta.',
      plan: rows[0]?.plan || 'free-beta'
    });
  } catch (error) {
    console.error('law alerts database error', error);
    return send(res, 500, { error: 'We could not save your preferences right now. Please try again later.' });
  }
};

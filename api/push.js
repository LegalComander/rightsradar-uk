const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const webpush = require('web-push');

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

function connectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || '';
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

function pushConfig() {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  const contact = String(process.env.VAPID_CONTACT_EMAIL || 'ukrightsradar@gmail.com').trim();
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails(`mailto:${contact}`, publicKey, privateKey);
  return { publicKey };
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      endpoint_hash TEXT PRIMARY KEY,
      subscription JSONB NOT NULL,
      jurisdiction TEXT NOT NULL,
      topics JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      consent_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS web_push_subscriptions_status_idx ON web_push_subscriptions(status)`;
  await sql`CREATE INDEX IF NOT EXISTS web_push_subscriptions_jurisdiction_idx ON web_push_subscriptions(jurisdiction)`;
}

function validSubscription(subscription) {
  if (!subscription || typeof subscription !== 'object') return false;
  const endpoint = String(subscription.endpoint || '');
  const p256dh = String(subscription.keys?.p256dh || '');
  const auth = String(subscription.keys?.auth || '');
  return endpoint.startsWith('https://') && endpoint.length < 4096 && p256dh.length > 20 && auth.length > 8;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'GET, POST');

  const config = pushConfig();
  if (req.method === 'GET') {
    return send(res, 200, {
      ok: true,
      enabled: Boolean(config),
      publicKey: config?.publicKey || null,
      privacy: 'Push subscriptions use a device/browser endpoint and selected topics. An email address is not required.'
    });
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Invalid request origin.' });
  if (!config) return send(res, 503, { error: 'Phone notifications are not enabled on the server yet.', code: 'PUSH_NOT_CONFIGURED' });

  const db = connectionString();
  if (!db) return send(res, 503, { error: 'Push subscription storage is not connected yet.', code: 'PUSH_DATABASE_NOT_CONFIGURED' });

  try {
    const sql = neon(db);
    await ensureSchema(sql);
    const body = parseBody(req);
    const action = String(body.action || 'subscribe');
    const subscription = body.subscription;

    if (!validSubscription(subscription)) return send(res, 400, { error: 'Invalid browser push subscription.' });
    const endpoint = String(subscription.endpoint);
    const endpointHash = crypto.createHash('sha256').update(endpoint).digest('hex');

    if (action === 'unsubscribe') {
      await sql`UPDATE web_push_subscriptions SET status='unsubscribed', updated_at=NOW() WHERE endpoint_hash=${endpointHash}`;
      return send(res, 200, { ok: true, message: 'Phone alerts are disabled for this device.' });
    }

    const jurisdiction = String(body.jurisdiction || '').trim();
    const topics = Array.isArray(body.topics) ? [...new Set(body.topics.map(String))] : [];
    const consent = body.consent === true;
    if (!ALLOWED_JURISDICTIONS.has(jurisdiction)) return send(res, 400, { error: 'Choose a valid jurisdiction.' });
    if (!topics.length || topics.some(topic => !ALLOWED_TOPICS.has(topic))) return send(res, 400, { error: 'Choose at least one valid topic.' });
    if (!consent) return send(res, 400, { error: 'Confirm that you want phone notifications on this device.' });

    const subscriptionJson = JSON.stringify(subscription);
    const topicsJson = JSON.stringify(topics);
    const now = new Date().toISOString();

    await sql`
      INSERT INTO web_push_subscriptions
        (endpoint_hash, subscription, jurisdiction, topics, status, consent_at, updated_at)
      VALUES
        (${endpointHash}, ${subscriptionJson}::jsonb, ${jurisdiction}, ${topicsJson}::jsonb, 'active', ${now}, ${now})
      ON CONFLICT (endpoint_hash) DO UPDATE SET
        subscription = EXCLUDED.subscription,
        jurisdiction = EXCLUDED.jurisdiction,
        topics = EXCLUDED.topics,
        status = 'active',
        consent_at = EXCLUDED.consent_at,
        updated_at = EXCLUDED.updated_at
    `;

    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: 'RightsRadar alerts enabled',
        body: 'Phone notifications are ready on this device. You can change your topics at any time.',
        url: '/alerts.html',
        tag: 'rightsradar-push-enabled'
      }), { TTL: 60 });
    } catch (error) {
      console.warn('welcome push could not be delivered', error?.statusCode || error?.message || error);
    }

    return send(res, 201, {
      ok: true,
      message: 'Phone alerts are enabled for this device.',
      jurisdiction,
      topics
    });
  } catch (error) {
    console.error('push subscription error', error);
    return send(res, 500, { error: 'Unable to update phone notifications right now.' });
  }
};

const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const webpush = require('web-push');

function dbUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || '';
}
function authOk(req) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  return String(req.headers.authorization || '') === `Bearer ${secret}`;
}
function pushReady() {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  const contact = String(process.env.VAPID_CONTACT_EMAIL || 'ukrightsradar@gmail.com').trim();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(`mailto:${contact}`, publicKey, privateKey);
  return true;
}
async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS law_alert_deliveries (
      endpoint_hash TEXT NOT NULL,
      event_key TEXT NOT NULL,
      delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (endpoint_hash, event_key)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS law_alert_deliveries_time_idx ON law_alert_deliveries(delivered_at)`;
}
function eventKey(item) {
  return crypto.createHash('sha256').update(`${item.kind}|${item.url}|${item.title}`).digest('hex');
}
function jurisdictionMatches(subscriptionJurisdiction, eventJurisdiction) {
  return subscriptionJurisdiction === 'uk-wide' || eventJurisdiction === 'uk-wide' || subscriptionJurisdiction === eventJurisdiction;
}
function topicMatches(subscriptionTopics, eventTopics) {
  if (!Array.isArray(subscriptionTopics) || !subscriptionTopics.length) return false;
  if (!Array.isArray(eventTopics) || !eventTopics.length) return false;
  return eventTopics.some(topic => subscriptionTopics.includes(topic));
}
function isRecent(date, hours = 48) {
  if (!date) return false;
  const time = new Date(date).getTime();
  return Number.isFinite(time) && time >= Date.now() - hours * 60 * 60 * 1000 && time <= Date.now() + 60 * 60 * 1000;
}
async function loadFeed(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'rightsradaruk.vercel.app').split(',')[0].trim();
  const response = await fetch(`${proto}://${host}/api/new-laws`, { headers: { 'user-agent': 'RightsRadarUK-alert-dispatch/1.0' } });
  if (!response.ok) throw new Error(`Law feed returned ${response.status}`);
  return response.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!authOk(req)) return res.status(process.env.CRON_SECRET ? 401 : 503).json({ error: process.env.CRON_SECRET ? 'Unauthorised.' : 'CRON_SECRET is not configured.' });
  if (!pushReady()) return res.status(503).json({ error: 'VAPID push keys are not configured.' });
  const database = dbUrl();
  if (!database) return res.status(503).json({ error: 'Database is not configured.' });

  try {
    const sql = neon(database);
    await ensureSchema(sql);
    const feed = await loadFeed(req);
    const events = [...(feed.laws || []), ...(feed.bills || [])]
      .filter(item => item.kind === 'law' && isRecent(item.date, 48))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 12);

    const subscriptions = await sql`
      SELECT endpoint_hash, subscription, jurisdiction, topics
      FROM web_push_subscriptions
      WHERE status='active'
    `;

    let sent = 0, skipped = 0, expired = 0;
    for (const subscriber of subscriptions) {
      const relevant = events.filter(item => jurisdictionMatches(subscriber.jurisdiction, item.jurisdiction) && topicMatches(subscriber.topics, item.topics));
      if (!relevant.length) { skipped++; continue; }

      const unseen = [];
      for (const item of relevant) {
        const key = eventKey(item);
        const rows = await sql`SELECT 1 FROM law_alert_deliveries WHERE endpoint_hash=${subscriber.endpoint_hash} AND event_key=${key} LIMIT 1`;
        if (!rows.length) unseen.push({ item, key });
      }
      if (!unseen.length) { skipped++; continue; }

      const lead = unseen[0].item;
      const extra = unseen.length - 1;
      const payload = {
        title: extra ? `Law change: ${lead.title} + ${extra} more` : `Law change: ${lead.title}`,
        body: extra ? `${extra + 1} new published-law updates match your RightsRadar topics.` : 'A newly published law matches one of your RightsRadar topics.',
        url: '/new-laws.html',
        tag: `rightsradar-law-${unseen[0].key.slice(0, 20)}`
      };

      try {
        await webpush.sendNotification(subscriber.subscription, JSON.stringify(payload), { TTL: 21600 });
        for (const { key } of unseen) {
          await sql`INSERT INTO law_alert_deliveries(endpoint_hash,event_key) VALUES(${subscriber.endpoint_hash},${key}) ON CONFLICT DO NOTHING`;
        }
        sent++;
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await sql`UPDATE web_push_subscriptions SET status='expired', updated_at=NOW() WHERE endpoint_hash=${subscriber.endpoint_hash}`;
          expired++;
        } else {
          console.error('law alert push failed', error?.statusCode || error?.message || error);
        }
      }
    }

    return res.status(200).json({ ok: true, checkedEvents: events.length, subscribers: subscriptions.length, sent, skipped, expired, sourceErrors: feed.errors || [] });
  } catch (error) {
    console.error('law alert dispatch error', error);
    return res.status(500).json({ error: 'Unable to dispatch law alerts right now.' });
  }
};
